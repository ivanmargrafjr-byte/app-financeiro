/**
 * The day-by-day path of the money ahead, and the days that path goes wrong.
 *
 * A monthly total hides the thing that actually hurts: a month that ends positive
 * can still run dry on the 12th, when the rent leaves and the salary has not
 * arrived. This walks the balance forward one day at a time so those days can be
 * named before they happen.
 */

import { addDays, type DateString } from "@/lib/domain/dateUtils"
import { countsAsOpenInvoice } from "@/lib/domain/homeSummary"
import { DEFAULT_CATEGORY_COLOR } from "@/lib/types"
import type { Card, Invoice, Transaction, TransactionDirection } from "@/lib/types"

export type CashFlowKind = "lancamento" | "fatura" | "simulado"

export type CashFlowItem = {
  id: string
  date: DateString
  description: string
  amountCents: number
  direction: TransactionDirection
  kind: CashFlowKind
  /** Only on income: how sure it is. */
  expectation?: "confirmada" | "esperada"
  /** Only on a receivable: who owes it. */
  counterparty?: string
  icon?: string
  iconUrl?: string
  color?: string
}

export type CashFlowDay = {
  date: DateString
  inCents: number
  outCents: number
  /** Balance at the end of this day, if everything listed lands as recorded. */
  balanceCents: number
  items: CashFlowItem[]
}

export type CashFlow = {
  days: CashFlowDay[]
  startBalanceCents: number
  endBalanceCents: number
  /** The lowest point of the whole path — the day the money is tightest. */
  lowest: { date: DateString; cents: number }
  /** The first day the balance goes below zero, or null when it never does. */
  firstNegative: { date: DateString; cents: number } | null
}

function isPending(t: Transaction): boolean {
  // Card purchases arrive through their invoice, and an invoice payment would take
  // out the money its own invoice already accounts for.
  return t.origin === "account" && !t.settled && !t.isInvoicePayment
}

/**
 * Pending items dated before today are placed on today rather than dropped: a bill
 * that was due last week and never checked is money that has still to leave, and
 * hiding it would make the projection kinder than reality.
 */
function clampToToday(date: DateString, today: DateString): DateString {
  return date < today ? today : date
}

export function buildCashFlow(input: {
  today: DateString
  days: number
  balanceCents: number
  transactions: Transaction[]
  openInvoices: Invoice[]
  cardsById: Map<string, Card>
  /** What-if entries from the simulator; never written anywhere. */
  simulated?: CashFlowItem[]
  /**
   * Leave out income marked as merely expected — the prudent scenario. Planning
   * around money that may not arrive is how a projection becomes a wish.
   */
  confirmedIncomeOnly?: boolean
}): CashFlow {
  const lastDay = addDays(input.today, input.days)

  const fromTransactions: CashFlowItem[] = input.transactions
    .filter((t) => isPending(t) && t.date <= lastDay)
    .filter(
      (t) =>
        !input.confirmedIncomeOnly ||
        t.direction === "out" ||
        t.incomeExpectation !== "esperada"
    )
    .map((t) => ({
      id: t.id,
      date: clampToToday(t.date, input.today),
      description: t.description,
      amountCents: t.amountCents,
      direction: t.direction,
      kind: "lancamento" as const,
      expectation: t.incomeExpectation,
      counterparty: t.counterparty,
      icon: t.categoryIcon,
      iconUrl: t.categoryIconUrl,
      color: t.categoryColor || DEFAULT_CATEGORY_COLOR,
    }))

  const fromInvoices: CashFlowItem[] = input.openInvoices
    .filter((invoice) => countsAsOpenInvoice(invoice, input.cardsById) && invoice.dueDate <= lastDay)
    .map((invoice) => {
      const card = input.cardsById.get(invoice.cardId)
      return {
        id: invoice.id,
        date: clampToToday(invoice.dueDate, input.today),
        description: card ? `Fatura ${card.name}` : "Fatura do cartão",
        amountCents: invoice.totalAmountCents,
        direction: "out" as const,
        kind: "fatura" as const,
        icon: card?.icon ?? "CreditCard",
        iconUrl: card?.iconUrl,
        color: card?.color || DEFAULT_CATEGORY_COLOR,
      }
    })

  const simulated = (input.simulated ?? []).filter(
    (item) => item.date >= input.today && item.date <= lastDay
  )

  const byDate = new Map<DateString, CashFlowItem[]>()
  for (const item of [...fromTransactions, ...fromInvoices, ...simulated]) {
    const list = byDate.get(item.date)
    if (list) list.push(item)
    else byDate.set(item.date, [item])
  }

  const days: CashFlowDay[] = []
  let balance = input.balanceCents
  let lowest = { date: input.today, cents: input.balanceCents }
  let firstNegative: CashFlow["firstNegative"] = input.balanceCents < 0
    ? { date: input.today, cents: input.balanceCents }
    : null

  for (let offset = 0; offset <= input.days; offset++) {
    const date = addDays(input.today, offset)
    const items = (byDate.get(date) ?? []).sort((a, b) => b.amountCents - a.amountCents)
    const inCents = items.filter((i) => i.direction === "in").reduce((t, i) => t + i.amountCents, 0)
    const outCents = items.filter((i) => i.direction === "out").reduce((t, i) => t + i.amountCents, 0)
    balance = balance + inCents - outCents
    if (balance < lowest.cents) lowest = { date, cents: balance }
    if (!firstNegative && balance < 0) firstNegative = { date, cents: balance }
    days.push({ date, inCents, outCents, balanceCents: balance, items })
  }

  return {
    days,
    startBalanceCents: input.balanceCents,
    endBalanceCents: balance,
    lowest,
    firstNegative,
  }
}

/** The days that actually have movement — the ones worth listing. */
export function daysWithMovement(flow: CashFlow): CashFlowDay[] {
  return flow.days.filter((day) => day.items.length > 0)
}
