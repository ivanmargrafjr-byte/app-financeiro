/**
 * The dashboard can look at a run of months instead of just one. The period always
 * *ends* at the month being browsed and reaches backwards, so stepping the month
 * navigation keeps the same window length and slides it.
 */

import { addMonths, type MonthString } from "@/lib/domain/dateUtils"

export const PERIOD_LENGTHS = [1, 3, 6] as const

export type PeriodLength = (typeof PERIOD_LENGTHS)[number]

export const PERIOD_LABELS: Record<PeriodLength, string> = {
  1: "1 mês",
  3: "3 meses",
  6: "6 meses",
}

/** The months the period covers, oldest first, including `endMonth` itself. */
export function monthsInPeriod(endMonth: MonthString, length: PeriodLength): MonthString[] {
  return Array.from({ length }, (_, i) => addMonths(endMonth, i - (length - 1)))
}
