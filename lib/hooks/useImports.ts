"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { deleteDoc, deleteField, getDocs, increment, runTransaction, serverTimestamp } from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { db } from "@/lib/firebase/client"
import { accountDocRef, importDocRef, importsCol, transactionDocRef } from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"

export type ImportBatch = {
  id: string
  source: string
  accountId: string
  fileName: string | null
  createdIds: string[]
  settledIds: string[]
  createdAt: number
}

function importsQueryKey(uid: string | undefined) {
  return ["imports", uid]
}

export function useImports() {
  const { user } = useAuth()

  return useQuery({
    queryKey: importsQueryKey(user?.uid),
    enabled: !!user,
    queryFn: async (): Promise<ImportBatch[]> => {
      const snap = await getDocs(importsCol(user!.uid))
      return snap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            source: (data.source as string | undefined) ?? "ofx",
            accountId: (data.accountId as string | undefined) ?? "",
            fileName: (data.fileName as string | undefined) ?? null,
            createdIds: (data.createdIds as string[] | undefined) ?? [],
            settledIds: (data.settledIds as string[] | undefined) ?? [],
            createdAt: tsToMillis(data.createdAt),
          }
        })
        .sort((a, b) => b.createdAt - a.createdAt)
    },
  })
}

const UNDO_CHUNK_SIZE = 100

function signed(direction: string, amountCents: number) {
  return direction === "in" ? amountCents : -amountCents
}

/**
 * Puts an import back the way it was: entries it created are deleted, entries it
 * merely marked as efetivado go back to pending, and the account balance is corrected
 * by exactly what is undone.
 *
 * The balance is recomputed from the documents actually found rather than from a
 * number stored at import time. Anything edited or deleted since simply does not
 * contribute — which is the only way to undo without inventing money that a later
 * edit already accounted for.
 */
export function useUndoImport() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (batch: ImportBatch) => {
      const uid = user!.uid
      const ids = [
        ...batch.createdIds.map((id) => ({ id, kind: "created" as const })),
        ...batch.settledIds.map((id) => ({ id, kind: "settled" as const })),
      ]

      for (let start = 0; start < ids.length; start += UNDO_CHUNK_SIZE) {
        const chunk = ids.slice(start, start + UNDO_CHUNK_SIZE)

        await runTransaction(db, async (trx) => {
          const snaps = await Promise.all(
            chunk.map((entry) => trx.get(transactionDocRef(uid, entry.id)))
          )
          let balanceDelta = 0

          snaps.forEach((snap, i) => {
            if (!snap.exists()) return
            const data = snap.data()
            if (data.importBatchId !== batch.id) return
            const amount = signed(data.direction as string, data.amountCents as number)

            if (chunk[i].kind === "created") {
              balanceDelta -= amount
              trx.delete(snap.ref)
              return
            }
            // Settled by the import: the money was counted when it was settled, so
            // undoing has to take it back out and leave the lançamento pending again.
            if (!data.settled) return
            balanceDelta -= amount
            trx.update(snap.ref, {
              settled: false,
              ofxFitId: deleteField(),
              importBatchId: deleteField(),
              updatedAt: serverTimestamp(),
            })
          })

          if (balanceDelta !== 0) {
            trx.update(accountDocRef(uid, batch.accountId), {
              currentBalanceCents: increment(balanceDelta),
              updatedAt: serverTimestamp(),
            })
          }
        })
      }

      await deleteDoc(importDocRef(uid, batch.id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.uid] })
      queryClient.invalidateQueries({ queryKey: importsQueryKey(user?.uid) })
    },
  })
}
