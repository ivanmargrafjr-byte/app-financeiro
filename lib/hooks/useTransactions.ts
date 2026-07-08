import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { db } from "@/lib/firebase/client"
import { accountDocRef, transactionDocRef, transactionsCol } from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"
import { monthOfDate } from "@/lib/domain/dateUtils"
import { toCents } from "@/lib/domain/money"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"
import type { Category, Transaction } from "@/lib/types"
import type { AccountTransactionFormValues } from "@/lib/validators/transaction"

function signedAmount(direction: "in" | "out", amountCents: number) {
  return direction === "in" ? amountCents : -amountCents
}

export function mapTransactionDoc(id: string, data: Record<string, unknown>): Transaction {
  return {
    id,
    origin: data.origin as Transaction["origin"],
    direction: data.direction as Transaction["direction"],
    amountCents: data.amountCents as number,
    description: data.description as string,
    categoryId: data.categoryId as string,
    categoryName: data.categoryName as string,
    categoryColor: data.categoryColor as string,
    categoryIcon: (data.categoryIcon as string | undefined) ?? DEFAULT_ICON_NAME,
    date: data.date as string,
    competenceMonth: data.competenceMonth as string,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
    // Docs written before the efetivar/estornar feature existed have no `settled`
    // field; their effect is already baked into the account balance, so treat them
    // as settled rather than retroactively turning them into pending entries.
    settled: (data.settled as boolean | undefined) ?? true,
    accountId: data.accountId as string | undefined,
    recurringSeriesId: data.recurringSeriesId as string | undefined,
    settledVia: data.settledVia as Transaction["settledVia"],
    linkedCardId: data.linkedCardId as string | undefined,
    linkedInvoiceId: data.linkedInvoiceId as string | undefined,
    linkedTransactionIds: data.linkedTransactionIds as string[] | undefined,
    cardId: data.cardId as string | undefined,
    invoiceId: data.invoiceId as string | undefined,
    installmentGroupId: data.installmentGroupId as string | undefined,
    installmentNumber: data.installmentNumber as number | undefined,
    installmentTotal: data.installmentTotal as number | undefined,
  }
}

function accountTransactionsQueryKey(uid: string | undefined, accountId: string) {
  return ["transactions", "account", uid, accountId]
}

export function useAccountTransactions(accountId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: accountTransactionsQueryKey(user?.uid, accountId),
    enabled: !!user,
    queryFn: async (): Promise<Transaction[]> => {
      const snap = await getDocs(
        query(
          transactionsCol(user!.uid),
          where("origin", "==", "account"),
          where("accountId", "==", accountId)
        )
      )
      return snap.docs
        .map((d) => mapTransactionDoc(d.id, d.data()))
        .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    },
  })
}

function monthTransactionsQueryKey(uid: string | undefined, month: string) {
  return ["transactions", "month", uid, month]
}

export function useMonthTransactions(month: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: monthTransactionsQueryKey(user?.uid, month),
    enabled: !!user,
    queryFn: async (): Promise<Transaction[]> => {
      const snap = await getDocs(
        query(transactionsCol(user!.uid), where("competenceMonth", "==", month))
      )
      return snap.docs
        .map((d) => mapTransactionDoc(d.id, d.data()))
        .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    },
  })
}

function invalidateTransactionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  uid: string | undefined
) {
  queryClient.invalidateQueries({ queryKey: ["transactions"] })
  queryClient.invalidateQueries({ queryKey: ["accounts", uid] })
}

export function useCreateAccountTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      values,
      category,
    }: {
      values: AccountTransactionFormValues
      category: Category
    }) => {
      const amountCents = toCents(values.amount)

      // New entries start pending — they only touch the account balance once
      // explicitly "efetivada" via useSettleTransaction, so this is a plain
      // doc write with no balance mutation.
      await setDoc(doc(transactionsCol(user!.uid)), {
        origin: "account",
        direction: values.direction,
        amountCents,
        description: values.description,
        categoryId: values.categoryId,
        categoryName: category.name,
        categoryColor: category.color,
        categoryIcon: category.icon,
        date: values.date,
        competenceMonth: monthOfDate(values.date),
        accountId: values.accountId,
        settled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}

export function useUpdateAccountTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
      category,
    }: {
      id: string
      values: AccountTransactionFormValues
      category: Category
    }) => {
      const newAmountCents = toCents(values.amount)

      await runTransaction(db, async (trx) => {
        const txRef = transactionDocRef(user!.uid, id)
        const txSnap = await trx.get(txRef)
        if (!txSnap.exists()) throw new Error("Transação não encontrada")
        const old = txSnap.data()
        const wasSettled = (old.settled as boolean | undefined) ?? true

        // A pending entry never touched any account balance, so editing it
        // (even switching accounts) must not touch one either.
        if (wasSettled) {
          const oldAccountId = old.accountId as string
          const oldSigned = signedAmount(old.direction, old.amountCents)
          const newSigned = signedAmount(values.direction, newAmountCents)

          if (oldAccountId === values.accountId) {
            trx.update(accountDocRef(user!.uid, values.accountId), {
              currentBalanceCents: increment(newSigned - oldSigned),
              updatedAt: serverTimestamp(),
            })
          } else {
            trx.update(accountDocRef(user!.uid, oldAccountId), {
              currentBalanceCents: increment(-oldSigned),
              updatedAt: serverTimestamp(),
            })
            trx.update(accountDocRef(user!.uid, values.accountId), {
              currentBalanceCents: increment(newSigned),
              updatedAt: serverTimestamp(),
            })
          }
        }

        trx.update(txRef, {
          direction: values.direction,
          amountCents: newAmountCents,
          description: values.description,
          categoryId: values.categoryId,
          categoryName: category.name,
          categoryColor: category.color,
          categoryIcon: category.icon,
          date: values.date,
          competenceMonth: monthOfDate(values.date),
          accountId: values.accountId,
          updatedAt: serverTimestamp(),
        })
      })
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}

/**
 * Applies a pending account entry to an account's balance, marking it settled.
 * `accountId` lets the user redirect the entry to a different account than the
 * one it was originally drafted against (defaults to the same account otherwise).
 */
export function useSettleTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, accountId }: { id: string; accountId: string }) => {
      await runTransaction(db, async (trx) => {
        const txRef = transactionDocRef(user!.uid, id)
        const txSnap = await trx.get(txRef)
        if (!txSnap.exists()) throw new Error("Lançamento não encontrado")
        const data = txSnap.data()
        if (data.settled) throw new Error("Lançamento já efetivado")

        trx.update(accountDocRef(user!.uid, accountId), {
          currentBalanceCents: increment(signedAmount(data.direction, data.amountCents)),
          updatedAt: serverTimestamp(),
        })
        trx.update(txRef, { settled: true, accountId, updatedAt: serverTimestamp() })
      })
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}

/** Reverses a settled account entry: undoes its balance effect and marks it pending again. */
export function useReverseTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await runTransaction(db, async (trx) => {
        const txRef = transactionDocRef(user!.uid, id)
        const txSnap = await trx.get(txRef)
        if (!txSnap.exists()) throw new Error("Lançamento não encontrado")
        const data = txSnap.data()
        if (!(data.settled ?? true)) throw new Error("Lançamento ainda não efetivado")

        trx.update(accountDocRef(user!.uid, data.accountId as string), {
          currentBalanceCents: increment(-signedAmount(data.direction, data.amountCents)),
          updatedAt: serverTimestamp(),
        })
        trx.update(txRef, { settled: false, updatedAt: serverTimestamp() })
      })
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}

export function useDeleteAccountTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await runTransaction(db, async (trx) => {
        const txRef = transactionDocRef(user!.uid, id)
        const txSnap = await trx.get(txRef)
        if (!txSnap.exists()) return
        const data = txSnap.data()
        const wasSettled = (data.settled as boolean | undefined) ?? true

        if (wasSettled) {
          const accountRef = accountDocRef(user!.uid, data.accountId as string)
          const accountSnap = await trx.get(accountRef)
          if (accountSnap.exists()) {
            trx.update(accountRef, {
              currentBalanceCents: increment(-signedAmount(data.direction, data.amountCents)),
              updatedAt: serverTimestamp(),
            })
          }
        }
        trx.delete(txRef)
      })
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}
