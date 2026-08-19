import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { v4 as uuidv4 } from "uuid"
import {
  doc,
  getDoc,
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
import type { Account, Category, Transaction } from "@/lib/types"
import { BALANCE_ADJUSTMENT_ICON_NAME, DEFAULT_CATEGORY_COLOR, TRANSFER_ICON_NAME } from "@/lib/types"
import type { AccountTransactionFormValues } from "@/lib/validators/transaction"
import type { BalanceAdjustmentFormValues } from "@/lib/validators/balanceAdjustment"
import type { TransferFormValues } from "@/lib/validators/transfer"

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
    categoryIconUrl: (data.categoryIconUrl as string | null | undefined) ?? undefined,
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
    ofxFitId: data.ofxFitId as string | undefined,
    counterAccountId: data.counterAccountId as string | undefined,
    transferGroupId: data.transferGroupId as string | undefined,
    settledVia: data.settledVia as Transaction["settledVia"],
    linkedCardId: data.linkedCardId as string | undefined,
    linkedInvoiceId: data.linkedInvoiceId as string | undefined,
    linkedTransactionIds: data.linkedTransactionIds as string[] | undefined,
    cardId: data.cardId as string | undefined,
    invoiceId: data.invoiceId as string | undefined,
    installmentGroupId: data.installmentGroupId as string | undefined,
    installmentNumber: data.installmentNumber as number | undefined,
    installmentTotal: data.installmentTotal as number | undefined,
    isInvoicePayment: data.isInvoicePayment as boolean | undefined,
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
      // No origin filter: this also picks up transfer legs booked against this
      // account (card-origin docs never set accountId, so they're naturally excluded).
      const snap = await getDocs(
        query(transactionsCol(user!.uid), where("accountId", "==", accountId))
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

async function fetchMonthTransactions(uid: string, month: string): Promise<Transaction[]> {
  const snap = await getDocs(query(transactionsCol(uid), where("competenceMonth", "==", month)))
  return snap.docs
    .map((d) => mapTransactionDoc(d.id, d.data()))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
}

export function useMonthTransactions(month: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: monthTransactionsQueryKey(user?.uid, month),
    enabled: !!user,
    queryFn: () => fetchMonthTransactions(user!.uid, month),
  })
}

export type MonthTransactions = { month: string; transactions: Transaction[] }

/**
 * One query per month, sharing the exact cache entry `useMonthTransactions` uses — so
 * widening the dashboard period reuses months already fetched, and the existing
 * `["transactions"]` invalidations still reach all of them.
 */
export function useMonthsTransactions(months: string[]) {
  const { user } = useAuth()

  return useQueries({
    queries: months.map((month) => ({
      queryKey: monthTransactionsQueryKey(user?.uid, month),
      enabled: !!user,
      queryFn: () => fetchMonthTransactions(user!.uid, month),
    })),
    combine: (results) => ({
      // Held back until every month has arrived, so totals never render half-summed.
      data: results.every((r) => r.data)
        ? results.map((r, i) => ({ month: months[i], transactions: r.data! }) as MonthTransactions)
        : undefined,
      isLoading: results.some((r) => r.isLoading),
    }),
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
        categoryIconUrl: category.iconUrl ?? null,
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
          categoryIconUrl: category.iconUrl ?? null,
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

/**
 * Moves money between two of the user's own accounts. Writes one transaction leg per
 * account (linked by transferGroupId) and updates both balances atomically — unlike a
 * regular lançamento, a transfer is always settled immediately, there's nothing to efetivar.
 */
export function useCreateTransfer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      fromAccount,
      toAccount,
      values,
    }: {
      fromAccount: Account
      toAccount: Account
      values: TransferFormValues
    }) => {
      if (fromAccount.id === toAccount.id) {
        throw new Error("Selecione contas diferentes")
      }
      const amountCents = toCents(values.amount)
      const description = values.description?.trim() || "Transferência"
      const competenceMonth = monthOfDate(values.date)
      const transferGroupId = uuidv4()
      const uid = user!.uid

      await runTransaction(db, async (trx) => {
        trx.update(accountDocRef(uid, fromAccount.id), {
          currentBalanceCents: increment(-amountCents),
          updatedAt: serverTimestamp(),
        })
        trx.update(accountDocRef(uid, toAccount.id), {
          currentBalanceCents: increment(amountCents),
          updatedAt: serverTimestamp(),
        })

        const base = {
          amountCents,
          categoryId: "",
          categoryName: "Transferência",
          categoryColor: DEFAULT_CATEGORY_COLOR,
          categoryIcon: TRANSFER_ICON_NAME,
          categoryIconUrl: null,
          date: values.date,
          competenceMonth,
          origin: "transfer" as const,
          transferGroupId,
          settled: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        trx.set(doc(transactionsCol(uid)), {
          ...base,
          direction: "out",
          description: `${description} para ${toAccount.name}`,
          accountId: fromAccount.id,
          counterAccountId: toAccount.id,
        })
        trx.set(doc(transactionsCol(uid)), {
          ...base,
          direction: "in",
          description: `${description} de ${fromAccount.name}`,
          accountId: toAccount.id,
          counterAccountId: fromAccount.id,
        })
      })
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}

/** Undoes a transfer: reverses both legs' balance effect and deletes both docs. */
export function useDeleteTransfer() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const uid = user!.uid
      const primarySnap = await getDoc(transactionDocRef(uid, transactionId))
      if (!primarySnap.exists()) return
      const primary = primarySnap.data()
      if (primary.origin !== "transfer") throw new Error("Lançamento inválido")

      const legsSnap = await getDocs(
        query(transactionsCol(uid), where("transferGroupId", "==", primary.transferGroupId))
      )

      await runTransaction(db, async (trx) => {
        for (const legDoc of legsSnap.docs) {
          const data = legDoc.data()
          trx.update(accountDocRef(uid, data.accountId as string), {
            currentBalanceCents: increment(-signedAmount(data.direction, data.amountCents)),
            updatedAt: serverTimestamp(),
          })
          trx.delete(legDoc.ref)
        }
      })
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}

/**
 * Reconciles an account's balance to a value the user types in (e.g. matching their
 * bank statement) by booking the difference as a single settled entry — a no-op if
 * the typed balance already matches. Excluded from dashboard totals (see
 * DashboardPage's summary filter) since it's a correction, not real income/expense;
 * deleting it (via the regular lançamento dropdown) reverses the balance like any
 * other settled account entry.
 */
export function useCreateBalanceAdjustment() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      account,
      values,
    }: {
      account: Account
      values: BalanceAdjustmentFormValues
    }) => {
      const newBalanceCents = toCents(values.newBalance)
      const delta = newBalanceCents - account.currentBalanceCents
      if (delta === 0) return

      const uid = user!.uid
      await runTransaction(db, async (trx) => {
        trx.update(accountDocRef(uid, account.id), {
          currentBalanceCents: increment(delta),
          updatedAt: serverTimestamp(),
        })
        trx.set(doc(transactionsCol(uid)), {
          origin: "adjustment",
          direction: delta > 0 ? "in" : "out",
          amountCents: Math.abs(delta),
          description: values.description?.trim() || "Ajuste de saldo",
          categoryId: "",
          categoryName: "Ajuste de saldo",
          categoryColor: DEFAULT_CATEGORY_COLOR,
          categoryIcon: BALANCE_ADJUSTMENT_ICON_NAME,
          categoryIconUrl: null,
          date: values.date,
          competenceMonth: monthOfDate(values.date),
          accountId: account.id,
          settled: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}

/**
 * One line of an extrato the user chose to import: either a new lançamento to
 * create, or a pendente to efetivar (when `settleTransactionId` is set).
 */
export type OfxImportEntry = {
  fitId: string
  date: string
  direction: "in" | "out"
  /** Magnitude — the sign lives in `direction`, as everywhere else in the app. */
  amountCents: number
  description: string
  /** Required to create; ignored when efetivando an existing lançamento. */
  category: Category | null
  /** When set, efetiva this pendente instead of creating a second lançamento. */
  settleTransactionId?: string
}

/**
 * Firestore allows 500 operations per transaction, and an extrato of a busy month
 * runs to a few hundred lines, so the import is split into chunks. Each chunk is
 * atomic on its own — and a chunk that fails leaves the earlier ones written but
 * consistent, because every write carries its FITID: importing the same file
 * again brings the already-written lines back as "Já importado", unchecked.
 */
const OFX_IMPORT_CHUNK_SIZE = 100

/**
 * Writes a batch of extrato lines against an account.
 *
 * Unlike a lançamento typed by hand, these arrive already settled: the money has
 * demonstrably moved at the bank, so there is nothing left to efetivar and the
 * account balance is updated in the same transaction.
 */
export function useImportOfxTransactions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      accountId,
      entries,
    }: {
      accountId: string
      entries: OfxImportEntry[]
    }) => {
      const uid = user!.uid

      for (let start = 0; start < entries.length; start += OFX_IMPORT_CHUNK_SIZE) {
        const chunk = entries.slice(start, start + OFX_IMPORT_CHUNK_SIZE)

        await runTransaction(db, async (trx) => {
          // Every read has to happen before the first write, so the pendentes
          // being efetivados are fetched up front.
          const settling = chunk.filter((entry) => entry.settleTransactionId)
          const settlingSnaps = await Promise.all(
            settling.map((entry) => trx.get(transactionDocRef(uid, entry.settleTransactionId!)))
          )

          let balanceDelta = 0

          settlingSnaps.forEach((snap, i) => {
            // Gone or already efetivado (another device, an earlier partial run):
            // skip rather than settle twice. The line stays in the file and comes
            // back on the next import if it really is missing.
            if (!snap.exists()) return
            const data = snap.data()
            if (data.settled) return

            balanceDelta += signedAmount(
              data.direction as "in" | "out",
              data.amountCents as number
            )
            trx.update(snap.ref, {
              settled: true,
              accountId,
              // Stamped so a later import of the same period recognises this
              // lançamento as this bank movement, not as something new.
              ofxFitId: settling[i].fitId,
              updatedAt: serverTimestamp(),
            })
          })

          for (const entry of chunk) {
            if (entry.settleTransactionId) continue
            if (!entry.category) throw new Error("Selecione uma categoria para cada lançamento")

            balanceDelta += signedAmount(entry.direction, entry.amountCents)
            trx.set(doc(transactionsCol(uid)), {
              origin: "account",
              direction: entry.direction,
              amountCents: entry.amountCents,
              description: entry.description,
              categoryId: entry.category.id,
              categoryName: entry.category.name,
              categoryColor: entry.category.color,
              categoryIcon: entry.category.icon,
              categoryIconUrl: entry.category.iconUrl ?? null,
              date: entry.date,
              competenceMonth: monthOfDate(entry.date),
              accountId,
              settled: true,
              ofxFitId: entry.fitId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          }

          if (balanceDelta !== 0) {
            trx.update(accountDocRef(uid, accountId), {
              currentBalanceCents: increment(balanceDelta),
              updatedAt: serverTimestamp(),
            })
          }
        })
      }
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, user?.uid),
  })
}
