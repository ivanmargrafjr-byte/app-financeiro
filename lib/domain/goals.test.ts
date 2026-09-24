import { describe, expect, it } from "vitest"

import { goalProgress, sumMonthly, sumSaved, type Goal } from "./goals"

const TODAY = "2026-09-24"

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: "g1",
    kind: "meta",
    name: "Viagem",
    targetCents: 600000,
    dueDate: "2027-03-10",
    savedCents: 0,
    icon: "Plane",
    color: "#7c3aed",
    createdAt: 0,
    ...overrides,
  }
}

describe("goalProgress", () => {
  it("divides what is missing by the months left, counting the month it is due", () => {
    const progress = goalProgress(goal({}), TODAY)

    expect(progress.monthsLeft).toBe(7)
    expect(progress.monthlyCents).toBe(Math.ceil(600000 / 7))
    expect(progress.missingCents).toBe(600000)
  })

  it("asks for less once part of it is put away", () => {
    const progress = goalProgress(goal({ savedCents: 250000 }), TODAY)

    expect(progress.missingCents).toBe(350000)
    expect(progress.monthlyCents).toBe(Math.ceil(350000 / 7))
    expect(progress.progressRatio).toBeCloseTo(0.4166, 3)
  })

  it("asks for nothing once it is reached", () => {
    const progress = goalProgress(goal({ savedCents: 600000 }), TODAY)

    expect(progress.reached).toBe(true)
    expect(progress.monthlyCents).toBe(0)
    expect(progress.progressRatio).toBe(1)
  })

  it("does not let an over-saved goal overflow its bar", () => {
    expect(goalProgress(goal({ savedCents: 900000 }), TODAY).progressRatio).toBe(1)
  })

  it("squeezes the whole amount into this month when the date has passed", () => {
    const progress = goalProgress(goal({ dueDate: "2026-08-10" }), TODAY)

    expect(progress.late).toBe(true)
    expect(progress.monthsLeft).toBe(1)
    expect(progress.monthlyCents).toBe(600000)
  })

  it("treats a goal due this month as having this month to finish", () => {
    const progress = goalProgress(goal({ dueDate: "2026-09-30" }), TODAY)

    expect(progress.monthsLeft).toBe(1)
    expect(progress.late).toBe(false)
  })

  it("handles an annual bill the same way a goal is handled", () => {
    const progress = goalProgress(
      goal({ kind: "anual", name: "IPVA", targetCents: 120000, dueDate: "2027-01-15" }),
      TODAY
    )

    expect(progress.monthsLeft).toBe(5)
    expect(progress.monthlyCents).toBe(24000)
  })
})

describe("sumSaved and sumMonthly", () => {
  it("adds what is put away and what the month is being asked for", () => {
    const goals = [
      goal({ savedCents: 100000 }),
      goal({ id: "g2", kind: "anual", name: "Seguro", targetCents: 120000, dueDate: "2027-01-15", savedCents: 20000 }),
    ]

    expect(sumSaved(goals)).toBe(120000)
    expect(sumMonthly(goals, TODAY)).toBe(Math.ceil(500000 / 7) + Math.ceil(100000 / 5))
  })
})
