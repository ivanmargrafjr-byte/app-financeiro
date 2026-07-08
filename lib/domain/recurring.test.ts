import { describe, expect, it } from "vitest"
import { occurrenceDateForMonth, recurringOccurrenceId, ruleAppliesToMonth } from "./recurring"

describe("recurringOccurrenceId", () => {
  it("is deterministic for the same rule+month", () => {
    expect(recurringOccurrenceId("rule1", "2026-07")).toBe(
      recurringOccurrenceId("rule1", "2026-07")
    )
  })

  it("differs across months, ensuring idempotent-but-distinct generation", () => {
    expect(recurringOccurrenceId("rule1", "2026-07")).not.toBe(
      recurringOccurrenceId("rule1", "2026-08")
    )
  })
})

describe("ruleAppliesToMonth", () => {
  const base = {
    dayOfMonth: 5,
    startMonth: "2026-03",
    endMonth: null as string | null,
    active: true,
    excludedMonths: [] as string[],
  }

  it("does not apply before the start month", () => {
    expect(ruleAppliesToMonth(base, "2026-02")).toBe(false)
  })

  it("applies on and after the start month with no end month", () => {
    expect(ruleAppliesToMonth(base, "2026-03")).toBe(true)
    expect(ruleAppliesToMonth(base, "2030-01")).toBe(true)
  })

  it("stops applying after the end month", () => {
    const rule = { ...base, endMonth: "2026-06" }
    expect(ruleAppliesToMonth(rule, "2026-06")).toBe(true)
    expect(ruleAppliesToMonth(rule, "2026-07")).toBe(false)
  })

  it("respects excludedMonths (single-occurrence deletion)", () => {
    const rule = { ...base, excludedMonths: ["2026-05"] }
    expect(ruleAppliesToMonth(rule, "2026-05")).toBe(false)
    expect(ruleAppliesToMonth(rule, "2026-04")).toBe(true)
  })

  it("never applies when inactive", () => {
    const rule = { ...base, active: false }
    expect(ruleAppliesToMonth(rule, "2026-03")).toBe(false)
  })
})

describe("occurrenceDateForMonth", () => {
  it("uses the day directly for a normal month", () => {
    expect(occurrenceDateForMonth(15, "2026-07")).toBe("2026-07-15")
  })

  it("clamps day 31 for a 30-day month", () => {
    expect(occurrenceDateForMonth(31, "2026-04")).toBe("2026-04-30")
  })

  it("clamps day 30 for February on a non-leap year", () => {
    expect(occurrenceDateForMonth(30, "2026-02")).toBe("2026-02-28")
  })
})
