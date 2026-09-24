"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addDoc,
  deleteDoc,
  getDocs,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { goalDocRef, goalsCol } from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"
import type { Goal, GoalKind } from "@/lib/domain/goals"

function goalsQueryKey(uid: string | undefined) {
  return ["goals", uid]
}

export type GoalInput = {
  kind: GoalKind
  name: string
  targetCents: number
  dueDate: string
  icon: string
  color: string
}

export function useGoals() {
  const { user } = useAuth()

  return useQuery({
    queryKey: goalsQueryKey(user?.uid),
    enabled: !!user,
    queryFn: async (): Promise<Goal[]> => {
      const snap = await getDocs(goalsCol(user!.uid))
      return snap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            kind: (data.kind as GoalKind | undefined) ?? "meta",
            name: (data.name as string | undefined) ?? "",
            targetCents: (data.targetCents as number | undefined) ?? 0,
            dueDate: (data.dueDate as string | undefined) ?? "",
            savedCents: (data.savedCents as number | undefined) ?? 0,
            icon: (data.icon as string | undefined) ?? "Target",
            color: (data.color as string | undefined) ?? "#5a12d6",
            createdAt: tsToMillis(data.createdAt),
          }
        })
        .sort((a, b) => (a.dueDate === b.dueDate ? 0 : a.dueDate < b.dueDate ? -1 : 1))
    },
  })
}

export function useCreateGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: GoalInput) => {
      await addDoc(goalsCol(user!.uid), {
        ...input,
        savedCents: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsQueryKey(user?.uid) }),
  })
}

export function useUpdateGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: GoalInput & { id: string }) => {
      await updateDoc(goalDocRef(user!.uid, id), { ...input, updatedAt: serverTimestamp() })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsQueryKey(user?.uid) }),
  })
}

/**
 * Adds to (or takes from) what is put away.
 *
 * Written with `increment` rather than a read-then-write: two devices putting money
 * away at once would otherwise overwrite each other, and the amount saved is exactly
 * the kind of number nobody notices going wrong.
 */
export function useSaveIntoGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, deltaCents }: { id: string; deltaCents: number }) => {
      await updateDoc(goalDocRef(user!.uid, id), {
        savedCents: increment(Math.round(deltaCents)),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsQueryKey(user?.uid) }),
  })
}

export function useDeleteGoal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(goalDocRef(user!.uid, id))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsQueryKey(user?.uid) }),
  })
}
