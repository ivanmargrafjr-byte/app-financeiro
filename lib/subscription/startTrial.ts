import type { User } from "firebase/auth"

export type TrialStartResult = {
  subscriptionStatus: string
  trialEndsAt: number | null
  granted: boolean
}

/**
 * Asks the server to create the profile and grant the free trial. The result is
 * informational — what the app actually reads is the profile doc, which the
 * route has already written by the time this resolves.
 */
export async function startTrial(user: User, displayName?: string | null): Promise<TrialStartResult> {
  const idToken = await user.getIdToken()
  const response = await fetch("/api/trial/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: displayName ?? user.displayName ?? null }),
  })
  if (!response.ok) throw new Error("trial start failed")
  return response.json()
}
