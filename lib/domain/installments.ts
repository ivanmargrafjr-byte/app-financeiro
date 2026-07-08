import { splitCents } from "./money"
import { referenceMonthForInstallment, resolveInvoiceCycleForPurchase, type CardCycleConfig } from "./invoiceCycle"
import type { DateString, MonthString } from "./dateUtils"

export type InstallmentPlanItem = {
  installmentNumber: number
  installmentTotal: number
  amountCents: number
  referenceMonth: MonthString
}

/**
 * Builds the full installment plan for a card purchase: splits the total
 * amount cent-exactly across `installmentTotal` parcels and assigns each one
 * to its invoice cycle (the 1st installment follows the normal purchase ->
 * cycle resolution; each subsequent one rolls forward one month).
 */
export function buildInstallmentPlan(
  totalCents: number,
  installmentTotal: number,
  purchaseDate: DateString,
  card: CardCycleConfig
): InstallmentPlanItem[] {
  if (installmentTotal < 1) {
    throw new Error("installmentTotal must be >= 1")
  }
  const amounts = splitCents(totalCents, installmentTotal)
  const firstReferenceMonth = resolveInvoiceCycleForPurchase(purchaseDate, card)

  return amounts.map((amountCents, i) => ({
    installmentNumber: i + 1,
    installmentTotal,
    amountCents,
    referenceMonth: referenceMonthForInstallment(firstReferenceMonth, i + 1),
  }))
}
