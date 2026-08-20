"use client"

import { useEffect, useRef, useState } from "react"

import { useAuth } from "@/lib/auth/AuthProvider"
import { isEligibleForTrial } from "@/lib/domain/subscriptionAccess"
import { startTrial } from "@/lib/subscription/startTrial"
import type { UserProfile } from "@/lib/types"

/**
 * Grants the free trial to anyone entitled to it who doesn't have it yet — the
 * accounts that signed up before the trial existed and bounced off the paywall,
 * and any signup whose grant didn't land the first time.
 *
 * While the grant is in flight the caller must wait rather than redirect: sending
 * someone to the paywall a beat before their trial starts is the exact experience
 * this feature exists to remove.
 */
export function useEnsureTrial(profile: UserProfile | null): { pending: boolean } {
  const { user } = useAuth()
  const requested = useRef(false)
  const [failed, setFailed] = useState(false)

  const needsTrial = !!profile && isEligibleForTrial(profile)

  useEffect(() => {
    if (!needsTrial || !user || requested.current) return
    requested.current = true
    // No success branch: the profile is under onSnapshot, so the new status arrives
    // on its own and flips needsTrial to false.
    startTrial(user).catch(() => setFailed(true))
  }, [needsTrial, user])

  return { pending: needsTrial && !failed }
}
