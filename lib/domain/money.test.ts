import { describe, expect, it } from "vitest"
import { formatCentsBRL, fromCents, splitCents, toCents } from "./money"

describe("toCents / fromCents", () => {
  it("round-trips a value", () => {
    expect(toCents(19.9)).toBe(1990)
    expect(fromCents(1990)).toBe(19.9)
  })
})

describe("formatCentsBRL", () => {
  it("formats cents as BRL currency", () => {
    expect(formatCentsBRL(152340)).toBe("R$ 1.523,40")
  })
})

describe("splitCents", () => {
  it("splits evenly when divisible", () => {
    expect(splitCents(9000, 3)).toEqual([3000, 3000, 3000])
  })

  it("distributes the remainder cent-by-cent across the first installments", () => {
    expect(splitCents(100, 3)).toEqual([34, 33, 33])
  })

  it("sums back exactly to the original total", () => {
    const parts = splitCents(123457, 7)
    expect(parts.reduce((a, b) => a + b, 0)).toBe(123457)
  })

  it("throws for n <= 0", () => {
    expect(() => splitCents(100, 0)).toThrow()
  })
})
