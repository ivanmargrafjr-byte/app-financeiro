/**
 * Decides what to do with each movement of an imported extrato, by comparing it
 * against what the account already holds.
 *
 * This exists because importing an extrato raw would double everything: a salary
 * lands in the app through a recurring rule *and* in the bank statement, and the
 * app's own lançamentos are what the balance is built from. So every movement is
 * classified before anything is written, and the user sees the classification.
 *
 * The principle is the one the fatura import already follows: never skip in
 * silence. A movement that looks repeated arrives unchecked and labelled, not
 * discarded — in an app about money, quietly dropping a real entry is a worse
 * error than a duplicate the user can see and delete.
 */

import type { DateString } from "@/lib/domain/dateUtils"
import { normalizeDescription } from "@/lib/domain/invoiceImportDedup"
import type { OfxTransaction } from "@/lib/domain/ofx"

export type OfxMatchKind =
  /** Same FITID came in on an earlier import — the bank's own id, so this is exact. */
  | "already-imported"
  /** Looks like a lançamento already efetivado; importing it would count twice. */
  | "already-settled"
  /** Looks like a lançamento still pendente — the right move is to efetivar it. */
  | "matches-pending"
  /** Nothing in the account resembles it; import creates a new lançamento. */
  | "new"

export type ExistingEntry = {
  id: string
  description: string
  /** Magnitude, as the app stores it — the sign lives in `direction`. */
  amountCents: number
  direction: "in" | "out"
  date: DateString
  settled: boolean
  /** Set when this lançamento itself came from an extrato import. */
  ofxFitId?: string
}

export type OfxMatch = {
  movement: OfxTransaction
  kind: OfxMatchKind
  /** The existing lançamento this movement was matched to, when there is one. */
  matchedId: string | null
}

/**
 * How far apart the two dates may be and still be the same movement.
 *
 * Matching on the exact day is too strict in practice: a recurring rule generates
 * the boleto on its due day while the bank debits it a day or two later, and a
 * card invoice paid on a Friday can be posted on the Monday. Three days covers a
 * weekend, which is the common case, without reaching into the next week's
 * lançamento of the same value.
 */
const DATE_TOLERANCE_DAYS = 3

function daysBetween(a: DateString, b: DateString): number {
  const toUtc = (d: DateString) => {
    const [y, m, day] = d.split("-").map(Number)
    return Date.UTC(y, m - 1, day)
  }
  return Math.abs(toUtc(a) - toUtc(b)) / 86_400_000
}

/** Words shared between the two descriptions, over the shorter one's word count. */
function descriptionOverlap(a: string, b: string): number {
  const wordsA = new Set(normalizeDescription(a).split(" ").filter(Boolean))
  const wordsB = new Set(normalizeDescription(b).split(" ").filter(Boolean))
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let shared = 0
  for (const word of wordsA) if (wordsB.has(word)) shared += 1
  return shared / Math.min(wordsA.size, wordsB.size)
}

function directionOf(movement: OfxTransaction): "in" | "out" {
  return movement.amountCents < 0 ? "out" : "in"
}

/**
 * Classifies every movement of a statement against the account's lançamentos.
 *
 * Matching is on value, direction and a date window — deliberately *not* on the
 * description, which almost never agrees: the bank writes "TED 341 JOAO SILVA"
 * where the user wrote "Aluguel". The description only breaks ties, when several
 * lançamentos of the same value sit inside the window.
 *
 * Each existing lançamento can absorb only one movement, so two identical debits
 * on the same day match two lançamentos, not the same one twice.
 */
export function matchOfxTransactions(
  movements: OfxTransaction[],
  existing: ExistingEntry[]
): OfxMatch[] {
  const importedFitIds = new Set(
    existing.map((entry) => entry.ofxFitId).filter((id): id is string => !!id)
  )
  const consumed = new Set<string>()

  return movements.map((movement) => {
    if (importedFitIds.has(movement.fitId)) {
      const previous = existing.find((entry) => entry.ofxFitId === movement.fitId)
      return { movement, kind: "already-imported" as const, matchedId: previous?.id ?? null }
    }

    const direction = directionOf(movement)
    const amountCents = Math.abs(movement.amountCents)

    const candidates = existing
      .filter(
        (entry) =>
          !consumed.has(entry.id) &&
          entry.amountCents === amountCents &&
          entry.direction === direction &&
          daysBetween(entry.date, movement.date) <= DATE_TOLERANCE_DAYS
      )
      .sort((a, b) => {
        const byDate = daysBetween(a.date, movement.date) - daysBetween(b.date, movement.date)
        if (byDate !== 0) return byDate

        const byDescription =
          descriptionOverlap(b.description, movement.description) -
          descriptionOverlap(a.description, movement.description)
        if (byDescription !== 0) return byDescription

        // With nothing else to separate them, prefer the pendente: efetivá-lo is
        // the action that actually helps, while the settled one is just skipped.
        return Number(a.settled) - Number(b.settled)
      })

    const match = candidates[0]
    if (!match) return { movement, kind: "new" as const, matchedId: null }

    consumed.add(match.id)
    return {
      movement,
      kind: match.settled ? ("already-settled" as const) : ("matches-pending" as const),
      matchedId: match.id,
    }
  })
}

/** Movements that should arrive checked: only the ones that add something. */
export function isSelectedByDefault(kind: OfxMatchKind): boolean {
  return kind === "new" || kind === "matches-pending"
}
