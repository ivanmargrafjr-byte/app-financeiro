import { describe, expect, it } from "vitest"

import { parseAmountInput, toCents } from "./money"
import { buildInstallmentPlan } from "./installments"

const CARD = { closingDay: 1, dueDay: 10 }

describe("parseAmountInput", () => {
  it("reads the comma as the decimal separator, as a pt-BR keyboard types it", () => {
    expect(parseAmountInput("12,50")).toBe(12.5)
  })

  it("still reads a dot as decimal", () => {
    expect(parseAmountInput("12.50")).toBe(12.5)
  })

  it("reads thousands dots alongside a decimal comma", () => {
    expect(parseAmountInput("1.234,56")).toBe(1234.56)
  })

  it("reads a plain integer", () => {
    expect(parseAmountInput("40")).toBe(40)
  })

  it("returns NaN for empty or non-numeric input, so callers can tell it apart from zero", () => {
    expect(parseAmountInput("")).toBeNaN()
    expect(parseAmountInput("   ")).toBeNaN()
    expect(parseAmountInput("abc")).toBeNaN()
  })
})

describe("juros typed with a comma reach the installments", () => {
  // The regression: Number("40,00") is NaN, and the settle dialog fell back to 0 —
  // producing parcelas that summed to the principal and understated what was owed.
  it("divides principal + juros across the parcelas", () => {
    const principal = toCents(300)
    const juros = toCents(parseAmountInput("40,00"))

    const plan = buildInstallmentPlan(principal, 4, "2026-03-10", CARD, juros)
    const total = plan.reduce((sum, p) => sum + p.amountCents, 0)

    expect(juros).toBe(4000)
    expect(total).toBe(toCents(340))
    expect(plan.map((p) => p.amountCents)).toEqual([8500, 8500, 8500, 8500])
  })

  it("would have dropped the juros under the old plain-Number parse", () => {
    expect(Number("40,00") || 0).toBe(0)
    expect(parseAmountInput("40,00")).toBe(40)
  })
})

describe("the settle dialog's own reading of the juros field", () => {
  // Mirrors SettleTransactionDialog.handleConfirm so the wiring is covered, not just
  // the parser it calls.
  function readJuros(raw: string): { value: number; rejected: boolean } {
    const value = raw.trim() ? parseAmountInput(raw) : 0
    return { value, rejected: !Number.isFinite(value) || value < 0 }
  }

  it("passes juros typed with a comma through to the plan", () => {
    expect(readJuros("40,00")).toEqual({ value: 40, rejected: false })
  })

  it("treats an untouched field as no juros", () => {
    expect(readJuros("")).toEqual({ value: 0, rejected: false })
    expect(readJuros("0")).toEqual({ value: 0, rejected: false })
  })

  it("rejects unparseable or negative input instead of silently charging zero", () => {
    expect(readJuros("abc").rejected).toBe(true)
    expect(readJuros("-5").rejected).toBe(true)
  })
})
