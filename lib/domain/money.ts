const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export function toCents(reais: number): number {
  return Math.round(reais * 100)
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
