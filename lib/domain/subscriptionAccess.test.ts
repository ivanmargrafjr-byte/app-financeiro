import { describe, expect, it } from "vitest"

import {
  hasAppAccess,
  isEligibleForTrial,
  trialDaysRemaining,
  trialEndsAtFrom,
  TRIAL_DAYS,
} from "./subscriptionAccess"
import type { UserProfile } from "@/lib/types"

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 7, 19, 12, 0, 0)

function profile(overrides: Partial<UserProfile>): UserProfile {
  return {
    email: "pessoa@exemplo.com",
    displayName: "Pessoa",
    subscriptionStatus: "none",
    ...overrides,
  }
}

describe("hasAppAccess", () => {
  it("lets a paying subscriber in", () => {
    expect(hasAppAccess(profile({ subscriptionStatus: "active" }), NOW)).toBe(true)
  })

  it("lets someone in during the free trial", () => {
    const trial = profile({ subscriptionStatus: "free_trial", trialEndsAt: NOW + DAY })

    expect(hasAppAccess(trial, NOW)).toBe(true)
  })

  it("blocks on the eighth day, the moment the trial runs out", () => {
    const trial = profile({ subscriptionStatus: "free_trial", trialEndsAt: NOW })

    expect(hasAppAccess(trial, NOW)).toBe(false)
    expect(hasAppAccess(trial, NOW + 1)).toBe(false)
    expect(hasAppAccess(trial, NOW - 1)).toBe(true)
  })

  it("blocks a free_trial with no end date rather than granting an unbounded one", () => {
    expect(hasAppAccess(profile({ subscriptionStatus: "free_trial" }), NOW)).toBe(false)
  })

  it("ignores a stale trialEndsAt once the person actually subscribed", () => {
    // The Stripe webhook flips the status; the old trial date stays on the doc.
    const subscriber = profile({ subscriptionStatus: "active", trialEndsAt: NOW - 30 * DAY })

    expect(hasAppAccess(subscriber, NOW)).toBe(true)
  })

  it("blocks someone with no subscription and no trial", () => {
    expect(hasAppAccess(profile({}), NOW)).toBe(false)
    expect(hasAppAccess(profile({ subscriptionStatus: "canceled" }), NOW)).toBe(false)
    expect(hasAppAccess(null, NOW)).toBe(false)
  })

  it("keeps letting exempt accounts in", () => {
    expect(hasAppAccess(profile({ subscriptionStatus: "exempt" }), NOW)).toBe(true)
  })
})

describe("trialDaysRemaining", () => {
  it("shows the full week the day it is granted", () => {
    const trial = profile({
      subscriptionStatus: "free_trial",
      trialEndsAt: trialEndsAtFrom(NOW),
    })

    expect(trialDaysRemaining(trial, NOW)).toBe(TRIAL_DAYS)
  })

  it("rounds up, so a partial day still counts as a day left", () => {
    const trial = profile({ subscriptionStatus: "free_trial", trialEndsAt: NOW + DAY / 2 })

    expect(trialDaysRemaining(trial, NOW)).toBe(1)
  })

  it("never goes negative", () => {
    const trial = profile({ subscriptionStatus: "free_trial", trialEndsAt: NOW - 5 * DAY })

    expect(trialDaysRemaining(trial, NOW)).toBe(0)
  })

  it("is zero for anyone not on the free trial", () => {
    expect(trialDaysRemaining(profile({ subscriptionStatus: "active" }), NOW)).toBe(0)
  })
})

describe("isEligibleForTrial", () => {
  it("grants it to a brand new profile", () => {
    expect(isEligibleForTrial({})).toBe(true)
    expect(isEligibleForTrial({ subscriptionStatus: "none" })).toBe(true)
  })

  it("refuses a second trial to someone who already had one", () => {
    // Signing out and back in must not renew it.
    expect(isEligibleForTrial({ subscriptionStatus: "none", trialStartedAt: NOW - 30 * DAY })).toBe(
      false
    )
  })

  it("refuses anyone who has already been a customer", () => {
    for (const status of ["active", "canceled", "past_due", "trialing"]) {
      expect(isEligibleForTrial({ subscriptionStatus: status })).toBe(false)
    }
  })

  it("leaves an exempt account alone", () => {
    expect(isEligibleForTrial({ subscriptionStatus: "exempt" })).toBe(false)
  })
})
