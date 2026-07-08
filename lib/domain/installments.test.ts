import { describe, expect, it } from "vitest"
import { buildInstallmentPlan } from "./installments"

describe("buildInstallmentPlan", () => {
  const card = { closingDay: 25, dueDay: 5 }

  it("splits the total across n installments summing back exactly to the original amount", () => {
    const plan = buildInstallmentPlan(100000, 3, "2026-07-10", card) // R$ 1000,00 / 3x
    const sum = plan.reduce((acc, p) => acc + p.amountCents, 0)
    expect(sum).toBe(100000)
    expect(plan.map((p) => p.amountCents)).toEqual([33334, 33333, 33333])
  })

  it("assigns consecutive reference months starting from the purchase's cycle", () => {
    const plan = buildInstallmentPlan(120000, 12, "2026-07-10", card)
    expect(plan.map((p) => p.referenceMonth)).toEqual([
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
    ])
  })

  it("rolls the first installment to the next cycle when purchased after closing day", () => {
    const plan = buildInstallmentPlan(30000, 3, "2026-07-26", card)
    expect(plan[0].referenceMonth).toBe("2026-08")
  })

  it("labels installments with number/total for display", () => {
    const plan = buildInstallmentPlan(30000, 3, "2026-07-10", card)
    expect(plan.map((p) => `${p.installmentNumber}/${p.installmentTotal}`)).toEqual([
      "1/3",
      "2/3",
      "3/3",
    ])
  })

  it("throws for a non-positive installment count", () => {
    expect(() => buildInstallmentPlan(1000, 0, "2026-07-10", card)).toThrow()
  })

  it("handles a single (à vista) installment", () => {
    const plan = buildInstallmentPlan(5000, 1, "2026-07-10", card)
    expect(plan).toEqual([
      { installmentNumber: 1, installmentTotal: 1, amountCents: 5000, referenceMonth: "2026-07" },
    ])
  })
})
