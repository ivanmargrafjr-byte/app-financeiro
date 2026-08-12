const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function toCents(reais: number): number {
  return Math.round(reais * 100)
}

/**
 * Reads an amount typed by hand. The decimal separator here is the comma, and a
 * pt-BR keyboard offers exactly that — but `Number("12,50")` is NaN, so a plain
 * parse silently drops what the user typed. Accepts both separators, and thousands
 * dots ("1.234,56"). Returns NaN for anything that isn't a number, so callers can
 * tell "typed nothing" from "typed something unparseable".
 */
export function parseAmountInput(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return NaN

  // With both separators present the comma is the decimal one (1.234,56); with only
  // dots, they're decimal (12.50) — a lone comma is decimal too (12,50).
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed

  return Number(normalized)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function formatCentsBRL(cents: number): string {
  return BRL_FORMATTER.format(fromCents(cents))
}

/**
 * Splits totalCents into n installments that sum back exactly to totalCents,
 * distributing the leftover cent-by-cent across the first installments.
 */
export function splitCents(totalCents: number, n: number): number[] {
  if (n <= 0) {
    throw new Error("n must be >= 1")
  }
  const base = Math.floor(totalCents / n)
  const remainder = totalCents - base * n
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0))
}
