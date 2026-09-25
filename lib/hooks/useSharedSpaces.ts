"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { db } from "@/lib/firebase/client"
import { tsToMillis } from "@/lib/firebase/timestamp"
import type { SharedExpense, Settlement, SpaceMember } from "@/lib/domain/sharedSpace"

export type SharedSpace = {
  id: string
  name: string
  ownerUid: string
  memberUids: string[]
  members: SpaceMember[]
  /** Lowercase e-mails invited but not yet accepted. */
  pendingEmails: string[]
  createdAt: number
}

function spacesCol() {
  return collection(db, "spaces")
}
function spaceDocRef(spaceId: string) {
  return doc(db, "spaces", spaceId)
}
function expensesCol(spaceId: string) {
  return collection(db, "spaces", spaceId, "expenses")
}
function settlementsCol(spaceId: string) {
  return collection(db, "spaces", spaceId, "settlements")
}

function mapSpace(id: string, data: Record<string, unknown>): SharedSpace {
  return {
    id,
    name: (data.name as string | undefined) ?? "Espaço compartilhado",
    ownerUid: (data.ownerUid as string | undefined) ?? "",
    memberUids: (data.memberUids as string[] | undefined) ?? [],
    members: (data.members as SpaceMember[] | undefined) ?? [],
    pendingEmails: (data.pendingEmails as string[] | undefined) ?? [],
    createdAt: tsToMillis(data.createdAt),
  }
}

/** The spaces this person belongs to, and the ones still waiting for their answer. */
export function useSharedSpaces() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["spaces", user?.uid],
    enabled: !!user,
    queryFn: async (): Promise<{ joined: SharedSpace[]; invited: SharedSpace[] }> => {
      const email = user!.email?.toLowerCase()
      const [mine, invites] = await Promise.all([
        getDocs(query(spacesCol(), where("memberUids", "array-contains", user!.uid))),
        email
          ? getDocs(query(spacesCol(), where("pendingEmails", "array-contains", email)))
          : Promise.resolve(null),
      ])
      return {
        joined: mine.docs.map((d) => mapSpace(d.id, d.data())),
        invited: invites ? invites.docs.map((d) => mapSpace(d.id, d.data())) : [],
      }
    },
  })
}

export function useCreateSharedSpace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const member: SpaceMember = {
        uid: user!.uid,
        email: user!.email ?? "",
        name: user!.displayName ?? null,
        role: "dono",
      }
      await addDoc(spacesCol(), {
        name: name.trim() || "Nossas contas",
        ownerUid: user!.uid,
        memberUids: [user!.uid],
        members: [member],
        pendingEmails: [],
        createdAt: serverTimestamp(),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces", user?.uid] }),
  })
}

/**
 * Invites by e-mail, which is all the app knows about someone who has not joined yet.
 * The invitation only becomes access when that person accepts with their own account.
 */
export function useInviteToSpace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ spaceId, email }: { spaceId: string; email: string }) => {
      await updateDoc(spaceDocRef(spaceId), {
        pendingEmails: arrayUnion(email.trim().toLowerCase()),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces", user?.uid] }),
  })
}

export function useAcceptInvite() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (space: SharedSpace) => {
      const email = user!.email?.toLowerCase() ?? ""
      const member: SpaceMember = {
        uid: user!.uid,
        email: user!.email ?? "",
        name: user!.displayName ?? null,
        role: "membro",
      }
      // Rules allow an invited person to change these two fields and nothing else,
      // so joining is written as exactly that: add me, remove my invitation.
      await updateDoc(spaceDocRef(space.id), {
        memberUids: arrayUnion(user!.uid),
        members: arrayUnion(member),
        pendingEmails: arrayRemove(email),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces", user?.uid] }),
  })
}

/** Leaving, or being removed by the owner — access ends the moment the uid comes out. */
export function useRemoveFromSpace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ space, uid }: { space: SharedSpace; uid: string }) => {
      const member = space.members.find((m) => m.uid === uid)
      await updateDoc(spaceDocRef(space.id), {
        memberUids: arrayRemove(uid),
        ...(member ? { members: arrayRemove(member) } : {}),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces", user?.uid] }),
  })
}

export function useDeleteSharedSpace() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (spaceId: string) => {
      await deleteDoc(spaceDocRef(spaceId))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["spaces", user?.uid] }),
  })
}

export function useSpaceLedger(spaceId: string | null) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["space-ledger", user?.uid, spaceId],
    enabled: !!user && !!spaceId,
    queryFn: async (): Promise<{ expenses: SharedExpense[]; settlements: Settlement[] }> => {
      const [expenses, settlements] = await Promise.all([
        getDocs(expensesCol(spaceId!)),
        getDocs(settlementsCol(spaceId!)),
      ])
      return {
        expenses: expenses.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<SharedExpense, "id">) }))
          .sort((a, b) => (a.date < b.date ? 1 : -1)),
        settlements: settlements.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Settlement, "id">),
        })),
      }
    },
  })
}

export function useAddSharedExpense() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      spaceId,
      expense,
    }: {
      spaceId: string
      expense: Omit<SharedExpense, "id" | "createdAt" | "createdByUid">
    }) => {
      await addDoc(expensesCol(spaceId), {
        ...expense,
        createdByUid: user!.uid,
        createdAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["space-ledger", user?.uid, variables.spaceId] })
    },
  })
}

export function useAddSettlement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      spaceId,
      settlement,
    }: {
      spaceId: string
      settlement: Omit<Settlement, "id" | "createdAt">
    }) => {
      await addDoc(settlementsCol(spaceId), { ...settlement, createdAt: serverTimestamp() })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["space-ledger", user?.uid, variables.spaceId] })
    },
  })
}
