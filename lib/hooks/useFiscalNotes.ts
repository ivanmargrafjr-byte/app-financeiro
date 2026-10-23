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
import {
  fiscalNoteDocRef,
  fiscalNoteFileStoragePath,
  fiscalNotesCol,
} from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"
import { normalizeAccessKey } from "@/lib/domain/fiscalNote"
import { toCents } from "@/lib/domain/money"
import type { FiscalNote } from "@/lib/types"
import type { FiscalNoteFormValues } from "@/lib/validators/fiscalNote"

function fiscalNotesQueryKey(uid: string | undefined) {
  return ["fiscalNotes", uid]
}

function fiscalNoteFields(values: FiscalNoteFormValues) {
  return {
    kind: values.kind,
    number: values.number,
    series: values.series || null,
    accessKey: normalizeAccessKey(values.accessKey),
    issuer: values.issuer,
    issuerDocument: values.issuerDocument || null,
    recipient: values.recipient || null,
    recipientDocument: values.recipientDocument || null,
    description: values.description,
    issueDate: values.issueDate,
    dueDate: values.dueDate || null,
    valueCents: toCents(values.value),
    taxCents: values.taxes != null ? toCents(values.taxes) : null,
    notes: values.notes || null,
  }
}

export function useFiscalNotes() {
  const { user } = useAuth()

  return useQuery({
    queryKey: fiscalNotesQueryKey(user?.uid),
    enabled: !!user,
    queryFn: async (): Promise<FiscalNote[]> => {
      const snap = await getDocs(
        query(fiscalNotesCol(user!.uid), where("archived", "==", false))
      )
      return snap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            kind: (data.kind as FiscalNote["kind"]) ?? "servico",
            number: data.number,
            series: (data.series as string | undefined) ?? null,
            accessKey: (data.accessKey as string | undefined) ?? null,
            issuer: data.issuer,
            issuerDocument: (data.issuerDocument as string | undefined) ?? null,
            recipient: (data.recipient as string | undefined) ?? null,
            recipientDocument: (data.recipientDocument as string | undefined) ?? null,
            description: data.description,
            issueDate: data.issueDate,
            dueDate: (data.dueDate as string | undefined) ?? null,
            valueCents: data.valueCents,
            taxCents: (data.taxCents as number | undefined) ?? null,
            notes: (data.notes as string | undefined) ?? null,
            fileName: (data.fileName as string | undefined) ?? null,
            fileUrl: (data.fileUrl as string | undefined) ?? null,
            fileStoragePath: (data.fileStoragePath as string | undefined) ?? null,
            archived: data.archived,
            createdAt: tsToMillis(data.createdAt),
            updatedAt: tsToMillis(data.updatedAt),
          } satisfies FiscalNote
        })
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
    },
  })
}

export function useCreateFiscalNote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: FiscalNoteFormValues) => {
      const uid = user!.uid
      const docRef = doc(fiscalNotesCol(uid))

      let fileName: string | null = null
      let fileUrl: string | null = null
      let fileStoragePath: string | null = null
      if (values.file) {
        fileStoragePath = fiscalNoteFileStoragePath(uid, docRef.id, values.file.name)
        const storageRef = ref(storage, fileStoragePath)
        await uploadBytes(storageRef, values.file)
        fileUrl = await getDownloadURL(storageRef)
        fileName = values.file.name
      }

      await setDoc(docRef, {
        ...fiscalNoteFields(values),
        fileName,
        fileUrl,
        fileStoragePath,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalNotesQueryKey(user?.uid) })
    },
  })
}

export function useUpdateFiscalNote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
      previousFileStoragePath,
    }: {
      id: string
      values: FiscalNoteFormValues
      previousFileStoragePath: string | null
    }) => {
      const uid = user!.uid

      let fileFields: { fileName: string; fileUrl: string; fileStoragePath: string } | null = null
      if (values.file) {
        if (previousFileStoragePath) {
          await deleteObject(ref(storage, previousFileStoragePath)).catch(() => {})
        }
        const fileStoragePath = fiscalNoteFileStoragePath(uid, id, values.file.name)
        const storageRef = ref(storage, fileStoragePath)
        await uploadBytes(storageRef, values.file)
        const fileUrl = await getDownloadURL(storageRef)
        fileFields = { fileName: values.file.name, fileUrl, fileStoragePath }
      }

      await updateDoc(fiscalNoteDocRef(uid, id), {
        ...fiscalNoteFields(values),
        ...fileFields,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalNotesQueryKey(user?.uid) })
    },
  })
}

export function useArchiveFiscalNote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(fiscalNoteDocRef(user!.uid, id), {
        archived: true,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalNotesQueryKey(user?.uid) })
    },
  })
}
