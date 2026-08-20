/**
 * The figures behind the tela de início: what is in the accounts now, what is
 * already promised to the cards, and what falls due next.
 *
 * These deliberately answer "how am I right now", not "how was month X" — the
 * month switcher moves the Fluxo card, but the balance and the commitments are
 * always anchored to today. A projection for a month the user merely browsed to
 * would read like a fact about their money and be neither.
 */

import { addDays, endOfMonth, type DateString } from "@/lib/domain/dateUtils"
import { cardCountsInMonth } from "@/lib/domain/cardCutoff"
import { DEFAULT_CATEGORY_COLOR } from "@/lib/types"
import type { Card, Invoice, Transaction, TransactionDirection } from "@/lib/types"

/** How far ahead the "próximos" list looks. */
export const UPCOMING_DAYS = 30

export type UpcomingKind = "lancamento" | "fatura"

export type UpcomingItem = {
  id: string
  date: DateString
  description: string
  amountCents: number
  direction: TransactionDirection
  kind: UpcomingKind
  /** The category's icon for a lançamento, the card's for a fatura. */
  icon: string
  iconUrl?: string
  color: string
}

/**
 * An open invoice is money owed unless it belongs to a card that was replaced and
 * whose months the replacement already carries — the same cutoff the monthly totals
 * apply. Invoices that ended up empty (every purchase deleted) are not a commitment.
 */
export function countsAsOpenInvoice(invoice: Invoice, cardsById: Map<string, Card>): boolean {
  if (invoice.status !== "open") return false
  if (invoice.totalAmountCents <= 0) return false
  return cardCountsInMonth(cardsById.get(invoice.cardId), invoice.referenceMonth)
}

export function sumOpenInvoicesCents(invoices: Invoice[], cardsById: Map<string, Card>): number {
  return invoices
    .filter((invoice) => countsAsOpenInvoice(invoice, cardsById))
    .reduce((total, invoice) => total + invoice.totalAmountCents, 0)
}

/**
 * A pending account entry — one the user wrote down but has not efetivado. These are
 * what the projection and the "próximos" list are made of: the app's own record of
 * what it expects to happen, which is exactly what a bank statement cannot tell you.
 */
function isPendingCommitment(transaction: Transaction): boolean {
  return (
    transaction.origin === "account" &&
    !transaction.settled &&
    // The fatura itself is listed separately; a pending payment entry would double it.
    !transaction.isInvoicePayment
  )
}

/**
 * What the balance becomes by the end of the current month if every pending entry
 * lands as written. Entries dated before today are included on purpose: a bill that
 * was due last week and is still unchecked is money that will still leave.
 */
export function projectBalanceToMonthEnd(input: {
  today: DateString
  balanceCents: number
  transactions: Transaction[]
}): { throughDate: DateString; cents: number } {
  const throughDate = endOfMonth(input.today)

  const pendingCents = input.transactions
    .filter((t) => isPendingCommitment(t) && t.date <= throughDate)
    .reduce((total, t) => total + (t.direction === "in" ? t.amountCents : -t.amountCents), 0)

  return { throughDate, cents: input.balanceCents + pendingCents }
}

/**
 * What falls due in the window ahead: pending lançamentos and invoices about to close
 * out. Only what the app already knows — nothing is forecast or inferred from habit.
 */
export function buildUpcoming(input: {
  today: DateString
  transactions: Transaction[]
  openInvoices: Invoice[]
  cardsById: Map<string, Card>
  days?: number
}): UpcomingItem[] {
  const limit = addDays(input.today, input.days ?? UPCOMING_DAYS)

  const lancamentos: UpcomingItem[] = input.transactions
    .filter((t) => isPendingCommitment(t) && t.date >= input.today && t.date <= limit)
    .map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amountCents: t.amountCents,
      direction: t.direction,
      kind: "lancamento" as const,
      icon: t.categoryIcon,
      iconUrl: t.categoryIconUrl,
      color: t.categoryColor || DEFAULT_CATEGORY_COLOR,
    }))

  const faturas: UpcomingItem[] = input.openInvoices
    .filter(
      (invoice) =>
        countsAsOpenInvoice(invoice, input.cardsById) &&
        invoice.dueDate >= input.today &&
        invoice.dueDate <= limit
    )
    .map((invoice) => {
      const card = input.cardsById.get(invoice.cardId)
      return {
        id: invoice.id,
        date: invoice.dueDate,
        description: card ? `Fatura ${card.name}` : "Fatura do cartão",
        amountCents: invoice.totalAmountCents,
        direction: "out" as const,
        kind: "fatura" as const,
        icon: card?.icon ?? "CreditCard",
        iconUrl: card?.iconUrl,
        color: card?.color || DEFAULT_CATEGORY_COLOR,
      }
    })

  return [...lancamentos, ...faturas].sort((a, b) =>
    a.date === b.date ? b.amountCents - a.amountCents : a.date < b.date ? -1 : 1
  )
}
