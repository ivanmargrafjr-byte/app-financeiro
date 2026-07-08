import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"

import { useAuth } from "@/lib/auth/AuthProvider"
import { storage } from "@/lib/firebase/client"
import { contractDocRef, contractFileStoragePath, contractsCol } from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"
import { toCents } from "@/lib/domain/money"
import type { Contract } from "@/lib/types"
import type { ContractFormValues } from "@/lib/validators/contract"

function contractsQueryKey(uid: string | undefined) {
  return ["contracts", uid]
}

function contractFields(values: ContractFormValues) {
  return {
    number: values.number,
    contractor: values.contractor,
    contractee: values.contractee,
    scope: values.scope,
    startDate: values.startDate,
    endDate: values.endDate,
    executionDays: values.executionDays ?? null,
    paymentMethod: values.paymentMethod,
    valueCents: values.value != null ? toCents(values.value) : null,
    notes: values.notes || null,
  }
}

export function useContracts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: contractsQueryKey(user?.uid),
    enabled: !!user,
    queryFn: async (): Promise<Contract[]> => {
      const snap = await getDocs(
        query(contractsCol(user!.uid), where("archived", "==", false))
      )
      return snap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            number: data.number,
            contractor: data.contractor,
            contractee: data.contractee,
            scope: data.scope,
            startDate: data.startDate,
            endDate: data.endDate,
            executionDays: (data.executionDays as number | undefined) ?? null,
            paymentMethod: data.paymentMethod,
            valueCents: (data.valueCents as number | undefined) ?? null,
            notes: (data.notes as string | undefined) ?? null,
            fileName: (data.fileName as string | undefined) ?? null,
            fileUrl: (data.fileUrl as string | undefined) ?? null,
            fileStoragePath: (data.fileStoragePath as string | undefined) ?? null,
            archived: data.archived,
            createdAt: tsToMillis(data.createdAt),
            updatedAt: tsToMillis(data.updatedAt),
          } satisfies Contract
        })
        .sort((a, b) => a.number.localeCompare(b.number, "pt-BR"))
    },
  })
}

export function useCreateContract() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: ContractFormValues) => {
      const uid = user!.uid
      const docRef = doc(contractsCol(uid))

      let fileName: string | null = null
      let fileUrl: string | null = null
      let fileStoragePath: string | null = null
      if (values.file) {
        fileStoragePath = contractFileStoragePath(uid, docRef.id, values.file.name)
        const storageRef = ref(storage, fileStoragePath)
        await uploadBytes(storageRef, values.file)
        fileUrl = await getDownloadURL(storageRef)
        fileName = values.file.name
      }

      await setDoc(docRef, {
        ...contractFields(values),
        fileName,
        fileUrl,
        fileStoragePath,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsQueryKey(user?.uid) })
    },
  })
}

export function useUpdateContract() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
      previousFileStoragePath,
    }: {
      id: string
      values: ContractFormValues
      previousFileStoragePath: string | null
    }) => {
      const uid = user!.uid

      let fileFields: { fileName: string; fileUrl: string; fileStoragePath: string } | null = null
      if (values.file) {
        if (previousFileStoragePath) {
          await deleteObject(ref(storage, previousFileStoragePath)).catch(() => {})
        }
        const fileStoragePath = contractFileStoragePath(uid, id, values.file.name)
        const storageRef = ref(storage, fileStoragePath)
        await uploadBytes(storageRef, values.file)
        const fileUrl = await getDownloadURL(storageRef)
        fileFields = { fileName: values.file.name, fileUrl, fileStoragePath }
      }

      await updateDoc(contractDocRef(uid, id), {
        ...contractFields(values),
        ...fileFields,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsQueryKey(user?.uid) })
    },
  })
}

export function useArchiveContract() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(contractDocRef(user!.uid, id), {
        archived: true,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsQueryKey(user?.uid) })
    },
  })
}
