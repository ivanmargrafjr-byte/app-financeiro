import { onSnapshot } from "firebase/firestore"
import { useEffect, useState } from "react"

import { useAuth } from "@/lib/auth/AuthProvider"
import { userDocRef } from "@/lib/firebase/paths"
import type { SubscriptionStatus, UserProfile } from "@/lib/types"

function mapUserProfile(data: Record<string, unknown> | undefined): UserProfile {
  return {
    email: (data?.email as string | null | undefined) ?? null,
    displayName: (data?.displayName as string | null | undefined) ?? null,
    subscriptionStatus: (data?.subscriptionStatus as SubscriptionStatus | undefined) ?? "none",
    stripeCustomerId: data?.stripeCustomerId as string | undefined,
    stripeSubscriptionId: data?.stripeSubscriptionId as string | undefined,
  }
}

/**
 * Live subscription to the user's own profile doc — used with `onSnapshot` (rather
 * than the usual react-query getDocs pattern) so the app notices immediately when
 * the Stripe webhook flips subscriptionStatus after checkout, without a page reload.
 */
export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const unsubscribe = onSnapshot(userDocRef(user.uid), (snap) => {
      setProfile(mapUserProfile(snap.data()))
      setIsLoading(false)
    })
    return unsubscribe
  }, [user])

  return { data: profile, isLoading }
}
