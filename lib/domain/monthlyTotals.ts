/**
 * The one rule for which transactions count as income or expense in a month.
 *
 * It lives here because both the Resumo and the tela de início answer the same
 * question and must never answer it differently — the app already had a run of
 * double-counting bugs, and two copies of this filter is exactly how those come
 * back.
 */

import { cardCountsInMonth } from "@/lib/domain/cardCutoff"
import type { Card, Transaction } from "@/lib/types"

/**
 * Entries paid via card keep their original doc as a checked historical marker,
 * but the amount that actually counts lives in the card transaction on the
 * invoice's due month — the marker is skipped to avoid counting it twice.
 * Invoice payments move money already counted via the invoice's card-origin
 * purchases out of the account — also excluded.
 * Transfers move money between the user's own accounts, and balance adjustments
 * are corrections whose effect is already in each account's current balance —
 * both neutral.
 * A card replaced by a new one keeps its old entries for the months only it
 * recorded, but from its cutoff month on they are a stale duplicate of what the
 * replacement carries — see lib/domain/cardCutoff.ts.
 */
export function countsInMonthlyTotals(
  transaction: Transaction,
  archivedCardsById: Map<string, Card>
): boolean {
  return (
    transaction.settledVia !== "card" &&
    !transaction.isInvoicePayment &&
    transaction.origin !== "transfer" &&
    transaction.origin !== "adjustment" &&
    cardCountsInMonth(archivedCardsById.get(transaction.cardId ?? ""), transaction.competenceMonth)
  )
}

export type MonthFlow = { receitasCents: number; despesasCents: number }

/** Income and expense totals for a set of transactions already scoped to a period. */
export function sumMonthFlow(
  transactions: Transaction[],
  archivedCardsById: Map<string, Card>
): MonthFlow {
  let receitasCents = 0
  let despesasCents = 0

  for (const transaction of transactions) {
    if (!countsInMonthlyTotals(transaction, archivedCardsById)) continue
    if (transaction.direction === "in") receitasCents += transaction.amountCents
    else despesasCents += transaction.amountCents
  }

  return { receitasCents, despesasCents }
}
