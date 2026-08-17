import { describe, expect, it } from "vitest"

import { monthsInPeriod } from "./dashboardPeriod"

describe("monthsInPeriod", () => {
  it("is just the browsed month when the period is one month", () => {
    expect(monthsInPeriod("2026-08", 1)).toEqual(["2026-08"])
  })

  it("reaches backwards and ends at the browsed month", () => {
    // The browsed month is the newest, so navigating forward slides the window.
    expect(monthsInPeriod("2026-08", 3)).toEqual(["2026-06", "2026-07", "2026-08"])
  })

  it("covers six months oldest first", () => {
    expect(monthsInPeriod("2026-08", 6)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ])
  })

  it("crosses a year boundary", () => {
    expect(monthsInPeriod("2027-01", 3)).toEqual(["2026-11", "2026-12", "2027-01"])
  })
})
