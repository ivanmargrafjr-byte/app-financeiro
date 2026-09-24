"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { deleteDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { budgetDocRef, budgetsCol } from "@/lib/firebase/paths"
import type { Budget } from "@/lib/domain/budget"

function budgetsQueryKey(uid: string | undefined) {
  return ["budgets", uid]
}

export function useBudgets() {
  const { user } = useAuth()

  return useQuery({
    queryKey: budgetsQueryKey(user?.uid),
    enabled: !!user,
    queryFn: async (): Promise<Budget[]> => {
      const snap = await getDocs(budgetsCol(user!.uid))
      return snap.docs.map((d) => ({
        categoryId: d.id,
        limitCents: (d.data().limitCents as number | undefined) ?? 0,
      }))
    },
  })
}

/** Writing to the category's own id keeps a category from ever having two limits. */
export function useSetBudget() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ categoryId, limitCents }: Budget) => {
      await setDoc(
        budgetDocRef(user!.uid, categoryId),
        { limitCents: Math.max(0, Math.round(limitCents)), updatedAt: serverTimestamp() },
        { merge: true }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsQueryKey(user?.uid) }),
  })
}

export function useDeleteBudget() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryId: string) => {
      await deleteDoc(budgetDocRef(user!.uid, categoryId))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsQueryKey(user?.uid) }),
  })
}
