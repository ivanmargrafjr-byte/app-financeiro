import { describe, expect, it } from "vitest"

import { dispositionForOccurrence, type RuleRange } from "./recurringPropagation"

const NOW = "2026-08"
const openEnded: RuleRange = { active: true, startMonth: "2026-01", endMonth: null }

describe("dispositionForOccurrence", () => {
  describe("what already happened is never touched", () => {
    it("keeps a settled occurrence, even far in the future", () => {
      // It already moved the account balance; rewriting the amount would desync it.
      expect(
        dispositionForOccurrence({ competenceMonth: "2026-12", settled: true }, openEnded, NOW)
      ).toBe("keep")
    })

    it("keeps a past month even when still pending", () => {
      // July's bill was for July's amount — a raise now doesn't change what was owed then.
      expect(
        dispositionForOccurrence({ competenceMonth: "2026-07", settled: false }, openEnded, NOW)
      ).toBe("keep")
    })

    it("keeps a settled occurrence even once the rule stops covering its month", () => {
      const switchedOff: RuleRange = { ...openEnded, active: false }

      expect(
        dispositionForOccurrence({ competenceMonth: "2026-12", settled: true }, switchedOff, NOW)
      ).toBe("keep")
    })
  })

  describe("months the rule still covers get the new values", () => {
    it("updates a future occurrence", () => {
      expect(
        dispositionForOccurrence({ competenceMonth: "2026-09", settled: false }, openEnded, NOW)
      ).toBe("update")
    })

    it("updates the current month while it is still pending", () => {
      expect(
        dispositionForOccurrence({ competenceMonth: NOW, settled: false }, openEnded, NOW)
      ).toBe("update")
    })

    it("updates the month sitting exactly on the end bound", () => {
      const endsInOctober: RuleRange = { ...openEnded, endMonth: "2026-10" }

      expect(
        dispositionForOccurrence({ competenceMonth: "2026-10", settled: false }, endsInOctober, NOW)
      ).toBe("update")
    })
  })

  describe("months the rule no longer covers are removed", () => {
    it("deletes a pending occurrence once the rule is switched off", () => {
      const switchedOff: RuleRange = { ...openEnded, active: false }

      expect(
        dispositionForOccurrence({ competenceMonth: "2027-04", settled: false }, switchedOff, NOW)
      ).toBe("delete")
    })

    it("deletes what falls past a shortened end month", () => {
      const endsInOctober: RuleRange = { ...openEnded, endMonth: "2026-10" }

      expect(
        dispositionForOccurrence({ competenceMonth: "2026-11", settled: false }, endsInOctober, NOW)
      ).toBe("delete")
    })

    it("deletes what falls before a start month moved forward", () => {
      const startsInDecember: RuleRange = { ...openEnded, startMonth: "2026-12" }

      expect(
        dispositionForOccurrence({ competenceMonth: "2026-09", settled: false }, startsInDecember, NOW)
      ).toBe("delete")
    })
  })

  it("compares months as calendar months across a year boundary", () => {
    expect(
      dispositionForOccurrence({ competenceMonth: "2027-01", settled: false }, openEnded, "2026-12")
    ).toBe("update")
    expect(
      dispositionForOccurrence({ competenceMonth: "2026-12", settled: false }, openEnded, "2027-01")
    ).toBe("keep")
  })
})
