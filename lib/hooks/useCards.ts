import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { cardDocRef, cardsCol } from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"
import { toCents } from "@/lib/domain/money"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"
import type { Card } from "@/lib/types"
import type { CardFormValues } from "@/lib/validators/card"

function cardsQueryKey(uid: string | undefined, archived = false) {
  // Prefix-shared with the archived key so archiving/unarchiving can invalidate both
  // lists with a single `["cards", uid]` invalidation.
  return archived ? ["cards", uid, "archived"] : ["cards", uid]
}

function useCardsWhere(archived: boolean) {
  const { user } = useAuth()

  return useQuery({
    queryKey: cardsQueryKey(user?.uid, archived),
    enabled: !!user,
    queryFn: async (): Promise<Card[]> => {
      const snap = await getDocs(query(cardsCol(user!.uid), where("archived", "==", archived)))
      return snap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: data.name,
            limitCents: data.limitCents,
            closingDay: data.closingDay,
            dueDay: data.dueDay,
            linkedAccountId: data.linkedAccountId,
            icon: (data.icon as string | undefined) ?? DEFAULT_ICON_NAME,
            iconUrl: (data.iconUrl as string | null | undefined) ?? undefined,
            color: data.color,
            archived: data.archived,
            createdAt: tsToMillis(data.createdAt),
          } satisfies Card
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    },
  })
}

export function useCards() {
  return useCardsWhere(false)
}

export function useArchivedCards() {
  return useCardsWhere(true)
}

export function useCreateCard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CardFormValues) => {
      await addDoc(cardsCol(user!.uid), {
        name: values.name,
        limitCents: toCents(values.limit),
        closingDay: values.closingDay,
        dueDay: values.dueDay,
        linkedAccountId: values.linkedAccountId,
        icon: values.icon,
        iconUrl: values.iconUrl ?? null,
        color: values.color,
        archived: false,
        createdAt: serverTimestamp(),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardsQueryKey(user?.uid) }),
  })
}

export function useUpdateCard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CardFormValues }) => {
      await updateDoc(cardDocRef(user!.uid, id), {
        name: values.name,
        limitCents: toCents(values.limit),
        closingDay: values.closingDay,
        dueDay: values.dueDay,
        linkedAccountId: values.linkedAccountId,
        icon: values.icon,
        iconUrl: values.iconUrl ?? null,
        color: values.color,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardsQueryKey(user?.uid) }),
  })
}

export function useSetCardArchived() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      await updateDoc(cardDocRef(user!.uid, id), { archived })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cardsQueryKey(user?.uid) }),
  })
}
