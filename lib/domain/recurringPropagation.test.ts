import { describe, expect, it } from "vitest"

import { shouldPropagateToOccurrence } from "./recurringPropagation"

const NOW = "2026-08"

describe("shouldPropagateToOccurrence", () => {
  it("rewrites a future occurrence that hasn't been settled", () => {
    expect(shouldPropagateToOccurrence({ competenceMonth: "2026-09", settled: false }, NOW)).toBe(
      true
    )
  })

  it("rewrites the current month while it is still pending", () => {
    expect(shouldPropagateToOccurrence({ competenceMonth: NOW, settled: false }, NOW)).toBe(true)
  })

  it("leaves a settled occurrence alone", () => {
    // It already moved the account balance; rewriting the amount would desync it.
    expect(shouldPropagateToOccurrence({ competenceMonth: "2026-12", settled: true }, NOW)).toBe(
      false
    )
  })

  it("leaves past months alone even when still pending", () => {
    // July's bill was for July's amount — a raise now doesn't change what was owed then.
    expect(shouldPropagateToOccurrence({ competenceMonth: "2026-07", settled: false }, NOW)).toBe(
      false
    )
  })

  it("compares months as calendar months across a year boundary", () => {
    expect(shouldPropagateToOccurrence({ competenceMonth: "2027-01", settled: false }, "2026-12")).toBe(
      true
    )
    expect(shouldPropagateToOccurrence({ competenceMonth: "2026-12", settled: false }, "2027-01")).toBe(
      false
    )
  })
})
