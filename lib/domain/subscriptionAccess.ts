/**
 * Who may use the app, and for how much longer.
 *
 * The free trial is granted without a card, so nothing external (no Stripe
 * subscription, no Apple receipt) vouches for it — `trialEndsAt` on the profile is
 * the whole truth. Access is therefore computed by comparing it against the clock
 * on every check, rather than by a nightly job flipping statuses: a job that fails
 * to run leaves people with access they no longer have, and this cannot.
 */

import { ACTIVE_SUBSCRIPTION_STATUSES, type SubscriptionStatus, type UserProfile } from "@/lib/types"

export const TRIAL_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function trialEndsAtFrom(startedAtMs: number): number {
  return startedAtMs + TRIAL_DAYS * DAY_MS
}

/** Milliseconds left of the free trial; 0 once it has run out or was never granted. */
export function trialMsRemaining(
  profile: Pick<UserProfile, "subscriptionStatus" | "trialEndsAt"> | null | undefined,
  nowMs: number
): number {
  if (!profile || profile.subscriptionStatus !== "free_trial" || !profile.trialEndsAt) return 0
  return Math.max(0, profile.trialEndsAt - nowMs)
}

/**
 * Whole days left, rounded up — a trial with six and a half days to go reads as 7,
 * which is what someone counting their days expects to see.
 */
export function trialDaysRemaining(
  profile: Pick<UserProfile, "subscriptionStatus" | "trialEndsAt"> | null | undefined,
  nowMs: number
): number {
  return Math.ceil(trialMsRemaining(profile, nowMs) / DAY_MS)
}

/** Whether the app should let this profile in right now. */
export function hasAppAccess(
  profile: Pick<UserProfile, "subscriptionStatus" | "trialEndsAt"> | null | undefined,
  nowMs: number
): boolean {
  if (!profile) return false
  if (profile.subscriptionStatus === "free_trial") return trialMsRemaining(profile, nowMs) > 0
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(profile.subscriptionStatus)
}

/**
 * Whether a profile may still be given the free trial.
 *
 * `trialStartedAt` is what makes this a one-time grant: it stays on the profile after
 * the trial ends, so signing out and back in — or any other second call — finds it and
 * declines. Anyone who has already been a customer (active, canceled, past_due) is
 * past the point of a trial, and an exempt account has no use for one.
 */
export function isEligibleForTrial(profile: {
  subscriptionStatus?: SubscriptionStatus | string
  trialStartedAt?: number
}): boolean {
  if (profile.trialStartedAt) return false
  return (profile.subscriptionStatus ?? "none") === "none"
}
