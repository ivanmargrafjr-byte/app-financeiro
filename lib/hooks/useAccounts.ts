import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { accountDocRef, accountsCol } from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"
import { toCents } from "@/lib/domain/money"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"
import type { Account, AccountType } from "@/lib/types"
import type { AccountFormValues } from "@/lib/validators/account"

function accountsQueryKey(uid: string | undefined) {
  return ["accounts", uid]
}

export function useAccounts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: accountsQueryKey(user?.uid),
    enabled: !!user,
    queryFn: async (): Promise<Account[]> => {
      const snap = await getDocs(
        query(accountsCol(user!.uid), where("archived", "==", false))
      )
      return snap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: data.name,
            type: data.type as AccountType,
            initialBalanceCents: data.initialBalanceCents,
            currentBalanceCents: data.currentBalanceCents,
            icon: (data.icon as string | undefined) ?? DEFAULT_ICON_NAME,
            iconUrl: (data.iconUrl as string | null | undefined) ?? undefined,
            color: data.color,
            archived: data.archived,
            createdAt: tsToMillis(data.createdAt),
            updatedAt: tsToMillis(data.updatedAt),
          } satisfies Account
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    },
  })
}

export function useCreateAccount() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const initialBalanceCents = toCents(values.initialBalance)
      await addDoc(accountsCol(user!.uid), {
        name: values.name,
        type: values.type,
        initialBalanceCents,
        currentBalanceCents: initialBalanceCents,
        icon: values.icon,
        iconUrl: values.iconUrl ?? null,
        color: values.color,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey(user?.uid) })
    },
  })
}

export function useUpdateAccount() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AccountFormValues }) => {
      await updateDoc(accountDocRef(user!.uid, id), {
        name: values.name,
        type: values.type,
        icon: values.icon,
        iconUrl: values.iconUrl ?? null,
        color: values.color,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey(user?.uid) })
    },
  })
}

export function useArchiveAccount() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(accountDocRef(user!.uid, id), {
        archived: true,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsQueryKey(user?.uid) })
    },
  })
}
