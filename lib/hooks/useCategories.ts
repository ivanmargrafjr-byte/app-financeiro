import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addDoc, getDocs, query, updateDoc, where } from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { categoriesCol, categoryDocRef } from "@/lib/firebase/paths"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"
import type { Category, CategoryType } from "@/lib/types"
import type { CategoryFormValues } from "@/lib/validators/category"

function categoriesQueryKey(uid: string | undefined) {
  return ["categories", uid]
}

export function useCategories() {
  const { user } = useAuth()

  return useQuery({
    queryKey: categoriesQueryKey(user?.uid),
    enabled: !!user,
    queryFn: async (): Promise<Category[]> => {
      const snap = await getDocs(
        query(categoriesCol(user!.uid), where("archived", "==", false))
      )
      return snap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: data.name,
            type: data.type as CategoryType,
            icon: (data.icon as string | undefined) ?? DEFAULT_ICON_NAME,
            color: data.color,
            archived: data.archived,
            isDefault: data.isDefault,
            parentId: (data.parentId as string | null | undefined) ?? null,
          } satisfies Category
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    },
  })
}

export function useCreateCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      await addDoc(categoriesCol(user!.uid), {
        name: values.name,
        type: values.type,
        color: values.color,
        icon: values.icon,
        archived: false,
        isDefault: false,
        parentId: values.parentId ?? null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey(user?.uid) })
    },
  })
}

export function useUpdateCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CategoryFormValues }) => {
      await updateDoc(categoryDocRef(user!.uid, id), {
        name: values.name,
        type: values.type,
        icon: values.icon,
        color: values.color,
        parentId: values.parentId ?? null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey(user?.uid) })
    },
  })
}

export function useArchiveCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(categoryDocRef(user!.uid, id), { archived: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey(user?.uid) })
    },
  })
}
