/**
 * Suggests a category for an imported extrato line, from how the user has
 * classified similar lançamentos before.
 *
 * An OFX carries no category — the bank sends description, value and date and
 * nothing else — so without this every import would mean classifying a hundred
 * lines by hand. The suggestion is only ever a default the user can change; it
 * is never applied silently to something they didn't see.
 */

import { normalizeDescription } from "@/lib/domain/invoiceImportDedup"

export type CategorizedEntry = {
  description: string
  categoryId: string
  direction: "in" | "out"
  /** Used only to prefer the most recent classification when they disagree. */
  createdAt: number
}

/**
 * Words that say how the money moved, not where it went. Left in, they would
 * make every PIX look like every other PIX and the suggestion would be noise —
 * "PIX ENVIADO PADARIA" has to match on "padaria", or not at all.
 */
const NOISE_WORDS = new Set([
  "compra", "cartao", "debito", "credito", "pagamento", "pagto", "pag",
  "ted", "doc", "pix", "enviado", "recebido", "recebida", "transferencia",
  "transf", "saque", "deposito", "tarifa", "cobranca", "titulo", "boleto",
  "de", "da", "do", "das", "dos", "e", "em", "para", "por", "a", "o", "no", "na",
  "sa", "s", "ltda", "me", "eireli", "mei", "cia", "com", "br",
])

function meaningfulWords(description: string): string[] {
  return normalizeDescription(description)
    .split(" ")
    .filter((word) => word.length > 2 && !NOISE_WORDS.has(word) && !/^\d+$/.test(word))
}

/** Overlap counted against the shorter side, so "CARREFOUR" still matches
 *  "SUPERMERCADO CARREFOUR SAO JOAO" instead of being diluted by its length. */
function overlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0

  const setB = new Set(b)
  let shared = 0
  for (const word of new Set(a)) if (setB.has(word)) shared += 1
  return shared / Math.min(new Set(a).size, setB.size)
}

/**
 * At least half the words of the shorter description have to agree. Below that
 * the match is usually a coincidence ("SAO" in two unrelated shop names), and a
 * wrong category that arrives pre-filled is worse than an empty one: the user
 * reads it as already decided and lets it through.
 */
const MIN_OVERLAP = 0.5

/**
 * Returns the category to pre-fill, or null when nothing in the history is close
 * enough and the user should choose.
 *
 * Direction is part of the match: a credit must not inherit the category of a
 * despesa that happens to be worded alike (a refund from the shop you buy at).
 */
export function suggestCategoryId(
  description: string,
  direction: "in" | "out",
  history: CategorizedEntry[]
): string | null {
  const words = meaningfulWords(description)
  if (words.length === 0) return null

  const sameDirection = history.filter(
    (entry) => entry.direction === direction && entry.categoryId
  )

  // An identical description settles it — most recent wins, since a
  // reclassification is the user correcting an earlier choice.
  const normalized = normalizeDescription(description)
  const exact = sameDirection
    .filter((entry) => normalizeDescription(entry.description) === normalized)
    .sort((a, b) => b.createdAt - a.createdAt)[0]
  if (exact) return exact.categoryId

  const scores = new Map<string, { score: number; createdAt: number }>()
  for (const entry of sameDirection) {
    const score = overlap(words, meaningfulWords(entry.description))
    if (score < MIN_OVERLAP) continue

    const current = scores.get(entry.categoryId)
    // Sum the evidence: a category the user picked for five similar shops beats
    // one they picked once, even if that single line reads slightly closer.
    scores.set(entry.categoryId, {
      score: (current?.score ?? 0) + score,
      createdAt: Math.max(current?.createdAt ?? 0, entry.createdAt),
    })
  }

  const best = [...scores.entries()].sort(
    (a, b) => b[1].score - a[1].score || b[1].createdAt - a[1].createdAt
  )[0]

  return best ? best[0] : null
}
