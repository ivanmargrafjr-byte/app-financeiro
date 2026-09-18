import { dateStringFromMillis, formatDateBR } from "@/lib/domain/dateUtils"

export type AdminStatusView = {
  /** The status the badge shows — not always the one stored. */
  status: string
  /** The free-trial history, or null for an account that never had the trial. */
  trialLine: string | null
}

/**
 * What the admin list shows for an account, split into the two questions it answers.
 *
 * The badge answers "can this account use the app right now?". An expired trial keeps
 * `free_trial` in the database — access lapses by the clock, not by a write — so for
 * the badge it is simply an account without a subscription.
 *
 * The line answers "has it ever had the free trial?", read from `trialEndsAt` and not
 * from the status: the status is rewritten by payments and by the admin's own buttons,
 * while the trial dates stay on the profile for good. That way an account that tried
 * the app and later became a subscriber, or was set back to "none", still shows it.
 */
export function adminStatusView(
  status: string,
  trialEndsAt: number | null,
  nowMs: number
): AdminStatusView {
  const trialRunning = status === "free_trial" && trialEndsAt !== null && trialEndsAt >= nowMs
  const shown = status === "free_trial" && !trialRunning ? "none" : status

  if (trialEndsAt === null) return { status: shown, trialLine: null }
  const date = formatDateBR(dateStringFromMillis(trialEndsAt))
  if (trialRunning) return { status: shown, trialLine: `termina em ${date}` }
  // A future date on an account no longer in trial means something cut it short —
  // a subscription or a manual release — so it did not "test until" that day.
  return { status: shown, trialLine: trialEndsAt < nowMs ? `testou até ${date}` : `teste até ${date}` }
}
