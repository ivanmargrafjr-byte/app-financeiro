/**
 * The figures behind the tela de início: what is in the accounts now, what is
 * already promised to the cards, and what falls due next.
 *
 * These deliberately answer "how am I right now", not "how was month X" — the
 * month switcher moves the Fluxo card, but the balance and the commitments are
 * always anchored to today. A projection for a month the user merely browsed to
 * would read like a fact about their money and be neither.
 */

import {
  addDays,
  compareMonth,
  endOfMonth,
  monthOfDate,
  type DateString,
  type MonthString,
} from "@/lib/domain/dateUtils"
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

  return {
    throughDate,
    cents: input.balanceCents + sumPendingCommitmentsThrough(input.transactions, throughDate),
  }
}

/** Every pending entry dated up to `throughDate`, signed — overdue ones included. */
function sumPendingCommitmentsThrough(
  transactions: Transaction[],
  throughDate: DateString
): number {
  return transactions
    .filter((t) => isPendingCommitment(t) && t.date <= throughDate)
    .reduce((total, t) => total + (t.direction === "in" ? t.amountCents : -t.amountCents), 0)
}

/**
 * How far an estimate for `month` should look: the end of that month, but never
 * earlier than the end of the current one. Paging back to a past month would
 * otherwise drop commitments that are still owed today and inflate the number.
 */
export function estimateHorizon(today: DateString, month: MonthString): DateString {
  const currentMonth = monthOfDate(today)
  const furthest = compareMonth(month, currentMonth) > 0 ? month : currentMonth
  return endOfMonth(`${furthest}-01`)
}

/**
 * What the balance becomes once everything already committed through `throughDate`
 * happens: the pending lançamentos, minus the invoices still open by then.
 *
 * Nothing here is scoped to a single month, and that is the point — a bill from
 * August left unchecked is still owed in September. Summing only the viewed month's
 * pending entries made the estimate forget every commitment as the month turned,
 * flattering the number by exactly what was most overdue.
 */
export function estimateBalanceThrough(input: {
  throughDate: DateString
  balanceCents: number
  transactions: Transaction[]
  openInvoices: Invoice[]
  cardsById: Map<string, Card>
}): number {
  // Open invoices have not debited any account yet (paying one does, via usePayInvoice),
  // so they are subtracted here; an invoice that came due months ago and was never paid
  // weighs the same as this month's.
  const invoicesCents = input.openInvoices
    .filter(
      (invoice) =>
        countsAsOpenInvoice(invoice, input.cardsById) && invoice.dueDate <= input.throughDate
    )
    .reduce((total, invoice) => total + invoice.totalAmountCents, 0)

  return (
    input.balanceCents +
    sumPendingCommitmentsThrough(input.transactions, input.throughDate) -
    invoicesCents
  )
}

export type FreeToSpend = {
  /** The horizon every figure below is measured to. */
  throughDate: DateString
  balanceCents: number
  /** Pending outflows already recorded, as a positive number. */
  committedCents: number
  /** Open invoices due by the horizon, as a positive number. */
  invoicesCents: number
  /** What the person chose to keep untouched, as a positive number. */
  reservedCents: number
  /** Already put away for goals and annual bills, as a positive number. */
  goalsCents: number
  /** Pending inflows — shown apart on purpose, never added to `cents`. */
  expectedIncomeCents: number
  /** The part of that income the person marked as merely expected. */
  uncertainIncomeCents: number
  /** What is actually free to spend; negative when the commitments outrun the money. */
  cents: number
}

/**
 * How much of the money in the accounts is genuinely free to spend before the
 * horizon — the question a bank balance never answers.
 *
 * Income that has not landed is deliberately left out of the total and reported
 * separately: a salary due next week is a plan, not money, and adding it produces
 * exactly the false comfort this figure exists to remove.
 *
 * Nothing is counted twice. A card purchase reaches this through its invoice, never
 * as a pending entry (`isPendingCommitment` only accepts account entries), and the
 * payment of an invoice is excluded there as well, so paying it does not subtract
 * the same money as the invoice it settles.
 */
export function freeToSpend(input: {
  throughDate: DateString
  balanceCents: number
  transactions: Transaction[]
  openInvoices: Invoice[]
  cardsById: Map<string, Card>
  reservedCents?: number
  goalsCents?: number
}): FreeToSpend {
  const due = input.transactions.filter(
    (t) => isPendingCommitment(t) && t.date <= input.throughDate
  )
  const committedCents = due
    .filter((t) => t.direction === "out")
    .reduce((total, t) => total + t.amountCents, 0)
  const incomeDue = due.filter((t) => t.direction === "in")
  const expectedIncomeCents = incomeDue.reduce((total, t) => total + t.amountCents, 0)
  const uncertainIncomeCents = incomeDue
    .filter((t) => t.incomeExpectation === "esperada")
    .reduce((total, t) => total + t.amountCents, 0)

  const invoicesCents = input.openInvoices
    .filter(
      (invoice) =>
        countsAsOpenInvoice(invoice, input.cardsById) && invoice.dueDate <= input.throughDate
    )
    .reduce((total, invoice) => total + invoice.totalAmountCents, 0)

  const reservedCents = Math.max(0, input.reservedCents ?? 0)
  // Money put away for a goal is still in the account, and still not available: the
  // whole point of saving for the IPVA is that this money is not for groceries.
  const goalsCents = Math.max(0, input.goalsCents ?? 0)

  return {
    throughDate: input.throughDate,
    balanceCents: input.balanceCents,
    committedCents,
    invoicesCents,
    reservedCents,
    goalsCents,
    expectedIncomeCents,
    uncertainIncomeCents,
    cents: input.balanceCents - committedCents - invoicesCents - reservedCents - goalsCents,
  }
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
