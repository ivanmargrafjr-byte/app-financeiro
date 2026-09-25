"use client"

import { useMutation } from "@tanstack/react-query"
import { setDoc } from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { userDocRef } from "@/lib/firebase/paths"
import type { AlertKind } from "@/lib/domain/alerts"

/**
 * Which kinds of alert the user turned off.
 *
 * Kept on the profile doc, like the reserve: it is a preference, it is tiny, and it
 * has to be there the moment a screen renders — a separate collection would mean a
 * second round trip before knowing what not to show.
 */
export function useDismissDuplicate() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (dismissedDuplicateIds: string[]) => {
      await setDoc(userDocRef(user!.uid), { dismissedDuplicateIds }, { merge: true })
    },
  })
}

export function useSetMutedAlerts() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (mutedAlertKinds: AlertKind[]) => {
      await setDoc(userDocRef(user!.uid), { mutedAlertKinds }, { merge: true })
    },
  })
}
