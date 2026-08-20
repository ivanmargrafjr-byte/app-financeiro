/**
 * All date handling in this app uses plain 'YYYY-MM' / 'YYYY-MM-DD' strings
 * (never Date/Timestamp) for anything representing a calendar day, to avoid
 * timezone off-by-one bugs. See lib/domain/invoiceCycle.ts for why this matters.
 */

export type MonthString = string // 'YYYY-MM'
export type DateString = string // 'YYYY-MM-DD'

export function daysInMonth(year: number, month: number): number {
  // month is 1-indexed; day 0 of next month = last day of this month
  return new Date(year, month, 0).getDate()
}

export function clampDayToMonth(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month))
}

export function parseMonth(month: MonthString): { year: number; month: number } {
  const [y, m] = month.split("-").map(Number)
  return { year: y, month: m }
}

export function formatMonth(year: number, month: number): MonthString {
  return `${year}-${String(month).padStart(2, "0")}`
}

export function formatDate(year: number, month: number, day: number): DateString {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function parseDate(date: DateString): { year: number; month: number; day: number } {
  const [y, m, d] = date.split("-").map(Number)
  return { year: y, month: m, day: d }
}

export function monthOfDate(date: DateString): MonthString {
  return date.slice(0, 7)
}

export function addMonths(month: MonthString, delta: number): MonthString {
  const { year, month: m } = parseMonth(month)
  const total = (year * 12 + (m - 1)) + delta
  const newYear = Math.floor(total / 12)
  const newMonth = (total % 12) + 1
  return formatMonth(newYear, newMonth)
}

export function todayDateString(): DateString {
  const now = new Date()
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function currentMonthString(): MonthString {
  const now = new Date()
  return formatMonth(now.getFullYear(), now.getMonth() + 1)
}

export function compareMonth(a: MonthString, b: MonthString): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function dayFromDate(date: DateString): number {
  return parseDate(date).day
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
})

export const MONTH_STRING_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
})

/** 'ago/26' — for axis labels, where the full month name doesn't fit. */
export function shortMonthLabel(month: MonthString): string {
  if (typeof month !== "string" || !MONTH_STRING_PATTERN.test(month)) {
    return month ? String(month) : "—"
  }
  const { year, month: m } = parseMonth(month)
  return SHORT_MONTH_FORMATTER.format(new Date(year, m - 1, 1)).replace(/\.?\s+de\s+/, "/")
}

export function monthLabel(month: MonthString): string {
  // A single malformed value (older data, a hand-edited doc) would otherwise build an
  // Invalid Date and make Intl.format throw, taking down every screen that renders a
  // month. Show the raw value instead — visibly odd, but not a crashed page.
  if (typeof month !== "string" || !MONTH_STRING_PATTERN.test(month)) {
    return month ? String(month) : "—"
  }
  const { year, month: m } = parseMonth(month)
  const label = MONTH_LABEL_FORMATTER.format(new Date(year, m - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Walks a plain date forward or back by whole days. Goes through UTC on purpose:
 * `new Date(y, m, d)` builds a local-midnight instant, and adding days across a DST
 * boundary would land on 23:00 of the previous day and lose one.
 */
export function addDays(date: DateString, delta: number): DateString {
  const { year, month, day } = parseDate(date)
  const shifted = new Date(Date.UTC(year, month - 1, day + delta))
  return formatDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

/** Last calendar day of the month a date falls in — 'YYYY-MM-DD'. */
export function endOfMonth(date: DateString): DateString {
  const { year, month } = parseDate(date)
  return formatDate(year, month, daysInMonth(year, month))
}

/** '2026-08-19' → '19/08/2026', for display. */
export function formatDateBR(date: DateString): DateString {
  return date.split("-").reverse().join("/")
}

const SHORT_MONTH_NAME_FORMATTER = new Intl.DateTimeFormat("pt-BR", { month: "short" })

/** Day and abbreviated month as separate pieces, for a compact two-line date badge. */
export function dayMonthParts(date: DateString): { day: string; month: string } {
  const { year, month, day } = parseDate(date)
  return {
    day: String(day).padStart(2, "0"),
    month: SHORT_MONTH_NAME_FORMATTER.format(new Date(year, month - 1, day))
      .replace(".", "")
      .toUpperCase(),
  }
}
