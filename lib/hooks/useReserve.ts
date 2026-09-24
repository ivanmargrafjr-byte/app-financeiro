"use client"

import { useMutation } from "@tanstack/react-query"
import { setDoc } from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { userDocRef } from "@/lib/firebase/paths"

/**
 * Sets the amount kept out of "livre para gastar".
 *
 * Written straight to the profile doc — the security rules let the owner write every
 * field of it except the billing ones, and useUserProfile is on onSnapshot, so the
 * screen updates without anything to invalidate.
 */
export function useSetReserved() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (reservedCents: number) => {
      await setDoc(
        userDocRef(user!.uid),
        { reservedCents: Math.max(0, Math.round(reservedCents)) },
        { merge: true }
      )
    },
  })
}
