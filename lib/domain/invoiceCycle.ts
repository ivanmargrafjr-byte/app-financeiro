import {
  addMonths,
  clampDayToMonth,
  daysInMonth,
  formatDate,
  monthOfDate,
  parseDate,
  parseMonth,
  type DateString,
  type MonthString,
} from "./dateUtils"

export type CardCycleConfig = {
  closingDay: number // 1-31
  dueDay: number // 1-31
}

/**
 * The closing date for a given reference month, clamped for short months
 * (e.g. closingDay=31 in February -> Feb 28/29).
 */
export function computeClosingDate(
  referenceMonth: MonthString,
  closingDay: number
): DateString {
  const { year, month } = parseMonth(referenceMonth)
  const day = clampDayToMonth(year, month, closingDay)
  return formatDate(year, month, day)
}

/**
 * The due date for an invoice whose reference month (closing month) is
 * `referenceMonth`. If dueDay > closingDay, the due date falls in the same
 * calendar month as the closing (rare: e.g. closes day 5, due day 15).
 * Otherwise (the common case, e.g. closes day 25, due day 5) it falls in the
 * following month.
 */
export function computeDueDate(
  referenceMonth: MonthString,
  closingDay: number,
  dueDay: number
): DateString {
  const dueMonth = dueDay > closingDay ? referenceMonth : addMonths(referenceMonth, 1)
  const { year, month } = parseMonth(dueMonth)
  const day = clampDayToMonth(year, month, dueDay)
  return formatDate(year, month, day)
}

/**
 * Resolves which invoice cycle (reference month) a purchase made on
 * `purchaseDate` falls into, given the card's closing day.
 *
 * Convention: a purchase made ON the closing day itself still belongs to the
 * invoice that closes that day (<=, not <). Flip this comparison here if a
 * given card's real-world behavior differs.
 */
export function resolveInvoiceCycleForPurchase(
  purchaseDate: DateString,
  card: CardCycleConfig
): MonthString {
  const { year, month, day } = parseDate(purchaseDate)
  const purchaseMonth = `${year}-${String(month).padStart(2, "0")}`
  const effectiveClosingDay = Math.min(card.closingDay, daysInMonth(year, month))

  return day <= effectiveClosingDay ? purchaseMonth : addMonths(purchaseMonth, 1)
}

/** Reference month for the k-th (1-indexed) installment, given the 1st installment's cycle. */
export function referenceMonthForInstallment(
  firstInstallmentReferenceMonth: MonthString,
  installmentNumber: number
): MonthString {
  return addMonths(firstInstallmentReferenceMonth, installmentNumber - 1)
}

export function invoiceDocId(cardId: string, referenceMonth: MonthString): string {
  return `${cardId}_${referenceMonth}`
}

/** The competence month an invoice's charges should be reported under (its due month). */
export function competenceMonthForInvoice(dueDate: DateString): MonthString {
  return monthOfDate(dueDate)
}
