import { clampDayToMonth, formatDate, parseMonth, type DateString, type MonthString } from "./dateUtils"

export type RecurringRuleConfig = {
  dayOfMonth: number
  startMonth: MonthString
  endMonth: MonthString | null
  active: boolean
  excludedMonths: string[]
}

/** Deterministic doc ID: generation is idempotent and never overwrites a user-edited occurrence. */
export function recurringOccurrenceId(ruleId: string, month: MonthString): string {
  return `rec_${ruleId}_${month.replace("-", "")}`
}

export function ruleAppliesToMonth(rule: RecurringRuleConfig, month: MonthString): boolean {
  if (!rule.active) return false
  if (month < rule.startMonth) return false
  if (rule.endMonth && month > rule.endMonth) return false
  if (rule.excludedMonths.includes(month)) return false
  return true
}

export function occurrenceDateForMonth(dayOfMonth: number, month: MonthString): DateString {
  const { year, month: m } = parseMonth(month)
  const day = clampDayToMonth(year, m, dayOfMonth)
  return formatDate(year, m, day)
}
