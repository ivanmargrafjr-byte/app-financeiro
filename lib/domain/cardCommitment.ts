/**
 * How much of what is coming is already spoken for by the cards.
 *
 * The question a limit never answers is "how much of my future income have I
 * already committed?" — instalments make that number grow quietly, one purchase at
 * a time, and it only shows up months later as an invoice that was always going to
 * arrive.
 */

import { addMonths, monthOfDate, type MonthString } from "@/lib/domain/dateUtils"
import { countsAsOpenInvoice } from "@/lib/domain/homeSummary"
import type { Card, Invoice, Transaction } from "@/lib/types"

export type MonthCommitment = {
  month: MonthString
  totalCents: number
  /** Per card, in the same order the cards were given. */
  byCard: { cardId: string; cents: number }[]
}

/**
 * What each of the next months already owes, per card.
 *
 * Read from the invoices rather than from the purchases: the app writes an invoice
 * for every month an instalment reaches, so the invoice totals are the commitment
 * itself, already netted of anything reversed.
 */
export function commitmentByMonth(input: {
  invoices: Invoice[]
  cardsById: Map<string, Card>
  fromMonth: MonthString
  months: number
}): MonthCommitment[] {
  const open = input.invoices.filter((invoice) => countsAsOpenInvoice(invoice, input.cardsById))

  return Array.from({ length: input.months }, (_, i) => {
    const month = addMonths(input.fromMonth, i)
    const due = open.filter((invoice) => monthOfDate(invoice.dueDate) === month)
    const byCard = new Map<string, number>()
    for (const invoice of due) {
      byCard.set(invoice.cardId, (byCard.get(invoice.cardId) ?? 0) + invoice.totalAmountCents)
    }
    return {
      month,
      totalCents: due.reduce((total, invoice) => total + invoice.totalAmountCents, 0),
      byCard: [...byCard].map(([cardId, cents]) => ({ cardId, cents })),
    }
  })
}

export type CardUsage = {
  card: Card
  /** Everything still owed on this card, across every open invoice. */
  committedCents: number
  /** Limit minus what is owed; negative when the invoices pass the limit. */
  availableCents: number
  /** 0–1, for a bar. Capped at 1 so an over-limit card does not overflow the track. */
  usedRatio: number
}

export function cardUsage(cards: Card[], invoices: Invoice[]): CardUsage[] {
  const cardsById = new Map(cards.map((c) => [c.id, c]))
  return cards.map((card) => {
    const committedCents = invoices
      .filter(
        (invoice) => invoice.cardId === card.id && countsAsOpenInvoice(invoice, cardsById)
      )
      .reduce((total, invoice) => total + invoice.totalAmountCents, 0)
    return {
      card,
      committedCents,
      availableCents: card.limitCents - committedCents,
      usedRatio: card.limitCents > 0 ? Math.min(1, committedCents / card.limitCents) : 0,
    }
  })
}

export type InstallmentPlan = {
  groupId: string
  description: string
  cardId: string
  totalParcels: number
  /** Parcels that have not been paid yet — the ones still in open invoices. */
  remainingParcels: number
  remainingCents: number
  /** The month the last unpaid parcel falls due; when it stops weighing. */
  lastMonth: MonthString
}

/**
 * Instalments still running, and the month each one stops costing money.
 *
 * "Remaining" counts the parcels sitting in invoices that are still open, not the
 * ones dated ahead: an invoice can be paid early, and a parcel in a paid invoice is
 * no longer a commitment whatever its date says.
 */
export function openInstallmentPlans(
  transactions: Transaction[],
  openInvoiceIds: Set<string>
): InstallmentPlan[] {
  const groups = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (!t.installmentGroupId || !t.installmentTotal || t.installmentTotal < 2) continue
    const list = groups.get(t.installmentGroupId)
    if (list) list.push(t)
    else groups.set(t.installmentGroupId, [t])
  }

  const plans: InstallmentPlan[] = []
  for (const [groupId, parcels] of groups) {
    const remaining = parcels.filter((t) => t.invoiceId && openInvoiceIds.has(t.invoiceId))
    if (remaining.length === 0) continue
    const first = parcels.reduce((a, b) => ((a.installmentNumber ?? 0) <= (b.installmentNumber ?? 0) ? a : b))
    plans.push({
      groupId,
      description: first.description,
      cardId: first.cardId ?? "",
      totalParcels: first.installmentTotal ?? parcels.length,
      remainingParcels: remaining.length,
      remainingCents: remaining.reduce((total, t) => total + t.amountCents, 0),
      lastMonth: remaining
        .map((t) => t.competenceMonth)
        .reduce((a, b) => (a > b ? a : b)),
    })
  }

  return plans.sort((a, b) => (a.lastMonth === b.lastMonth ? 0 : a.lastMonth < b.lastMonth ? -1 : 1))
}
