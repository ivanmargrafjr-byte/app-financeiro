import { describe, expect, it } from "vitest"

import { adminStatusView } from "./statusView"

const NOW = new Date(2026, 8, 18, 12, 0, 0).getTime()
const PAST = new Date(2026, 8, 12, 9, 0, 0).getTime()
const FUTURE = new Date(2026, 8, 24, 9, 0, 0).getTime()

describe("adminStatusView", () => {
  it("shows a running trial with the day it ends", () => {
    expect(adminStatusView("free_trial", FUTURE, NOW)).toEqual({
      status: "free_trial",
      trialLine: "termina em 24/09/2026",
    })
  })

  it("shows an expired trial as an account without a subscription that tested", () => {
    expect(adminStatusView("free_trial", PAST, NOW)).toEqual({
      status: "none",
      trialLine: "testou até 12/09/2026",
    })
  })

  it("keeps the trial history on an account that became a subscriber", () => {
    expect(adminStatusView("active", PAST, NOW)).toEqual({
      status: "active",
      trialLine: "testou até 12/09/2026",
    })
  })

  it("keeps it on an account the admin set back to none", () => {
    expect(adminStatusView("none", PAST, NOW)).toEqual({
      status: "none",
      trialLine: "testou até 12/09/2026",
    })
  })

  it("does not claim a trial ran to a day that was cut short", () => {
    expect(adminStatusView("exempt", FUTURE, NOW)).toEqual({
      status: "exempt",
      trialLine: "teste até 24/09/2026",
    })
  })

  it("adds nothing for an account that never had the trial", () => {
    expect(adminStatusView("none", null, NOW)).toEqual({ status: "none", trialLine: null })
  })

  it("treats a trial with no end date as no access, like the paywall does", () => {
    expect(adminStatusView("free_trial", null, NOW)).toEqual({ status: "none", trialLine: null })
  })
})
