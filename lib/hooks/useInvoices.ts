import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { v4 as uuidv4 } from "uuid"
import {
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction as FirestoreWriteTransaction,
} from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { db } from "@/lib/firebase/client"
import {
  accountDocRef,
  invoiceDocRef,
  invoicesCol,
  transactionDocRef,
  transactionsCol,
} from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"
import { mapTransactionDoc } from "@/lib/hooks/useTransactions"
import {
  computeClosingDate,
  computeDueDate,
  competenceMonthForInvoice,
  invoiceDocId,
  resolveInvoiceCycleForPurchase,
} from "@/lib/domain/invoiceCycle"
import { buildInstallmentPlan, type InstallmentPlanItem } from "@/lib/domain/installments"
import { addMonths, todayDateString } from "@/lib/domain/dateUtils"
import { toCents } from "@/lib/domain/money"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"
import type { Card, Category, Invoice } from "@/lib/types"
import type { CardPurchaseFormValues } from "@/lib/validators/cardPurchase"
import type { CardTransactionEditFormValues } from "@/lib/validators/cardTransactionEdit"

type PlanTransactionBase = {
  description: string
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string
  categoryIconUrl: string | null
  date: string
}

function assertNoInstallmentTargetsPaidInvoice(invoiceSnaps: DocumentSnapshot[]) {
  if (invoiceSnaps.some((snap) => snap.exists() && snap.data()!.status === "paid")) {
    throw new Error("Uma das parcelas cairia em uma fatura já paga. Ajuste a data da compra.")
  }
}

type WrittenInstallment = {
  competenceMonth: string
  transactionId: string
  invoiceId: string
  amountCents: number
}

/**
 * Writes (or increments) each installment's invoice and creates its card transaction doc.
 * Returns per-installment details (which doc, which invoice, how much, which month) in plan
 * order, so callers can tell the user where a purchase/settlement ended up and, later, reverse it.
 */
function writeInstallmentPlan(
  trx: FirestoreWriteTransaction,
  uid: string,
  card: Card,
  plan: InstallmentPlanItem[],
  invoiceRefs: DocumentReference[],
  invoiceSnaps: DocumentSnapshot[],
  installmentGroupId: string | undefined,
  base: PlanTransactionBase
): WrittenInstallment[] {
  return plan.map((item, i) => {
    const invoiceRef = invoiceRefs[i]
    const closingDate = computeClosingDate(item.referenceMonth, card.closingDay)
    const dueDate = computeDueDate(item.referenceMonth, card.closingDay, card.dueDay)

    if (!invoiceSnaps[i].exists()) {
      trx.set(invoiceRef, {
        cardId: card.id,
        referenceMonth: item.referenceMonth,
        closingDate,
        dueDate,
        totalAmountCents: item.amountCents,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      trx.update(invoiceRef, {
        totalAmountCents: increment(item.amountCents),
        updatedAt: serverTimestamp(),
      })
    }

    const txRef = doc(transactionsCol(uid))
    const competenceMonth = competenceMonthForInvoice(dueDate)
    trx.set(txRef, {
      origin: "card",
      direction: "out",
      amountCents: item.amountCents,
      ...base,
      competenceMonth,
      cardId: card.id,
      invoiceId: invoiceRef.id,
      ...(installmentGroupId
        ? {
            installmentGroupId,
            installmentNumber: item.installmentNumber,
            installmentTotal: item.installmentTotal,
          }
        : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return {
      competenceMonth,
      transactionId: txRef.id,
      invoiceId: invoiceRef.id,
      amountCents: item.amountCents,
    }
  })
}

function mapInvoiceDoc(id: string, data: Record<string, unknown>): Invoice {
  return {
    id,
    cardId: data.cardId as string,
    referenceMonth: data.referenceMonth as string,
    closingDate: data.closingDate as string,
    dueDate: data.dueDate as string,
    totalAmountCents: data.totalAmountCents as number,
    status: data.status as Invoice["status"],
    paidAt: data.paidAt ? tsToMillis(data.paidAt) : undefined,
    paidFromAccountId: data.paidFromAccountId as string | undefined,
    paidTransactionId: data.paidTransactionId as string | undefined,
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
  }
}

function cardInvoicesQueryKey(uid: string | undefined, cardId: string) {
  return ["invoices", uid, cardId]
}

export function useCardInvoices(cardId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: cardInvoicesQueryKey(user?.uid, cardId),
    enabled: !!user,
    queryFn: async (): Promise<Invoice[]> => {
      const snap = await getDocs(query(invoicesCol(user!.uid), where("cardId", "==", cardId)))
      return snap.docs
        .map((d) => mapInvoiceDoc(d.id, d.data()))
        .sort((a, b) => (a.referenceMonth < b.referenceMonth ? 1 : -1))
    },
  })
}

/** All invoices (any card) whose due date falls within the given month — for the monthly overview. */
export function useMonthInvoices(month: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["invoices", "month", user?.uid, month],
    enabled: !!user,
    queryFn: async (): Promise<Invoice[]> => {
      const snap = await getDocs(
        query(
          invoicesCol(user!.uid),
          where("dueDate", ">=", `${month}-01`),
          where("dueDate", "<=", `${month}-31`)
        )
      )
      return snap.docs
        .map((d) => mapInvoiceDoc(d.id, d.data()))
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    },
  })
}

export function useInvoice(invoiceId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["invoice", user?.uid, invoiceId],
    enabled: !!user,
    queryFn: async (): Promise<Invoice | null> => {
      const snap = await getDoc(invoiceDocRef(user!.uid, invoiceId))
      return snap.exists() ? mapInvoiceDoc(snap.id, snap.data()) : null
    },
  })
}

function invoiceTransactionsQueryKey(uid: string | undefined, invoiceId: string) {
  return ["transactions", "invoice", uid, invoiceId]
}

export function useInvoiceTransactions(invoiceId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: invoiceTransactionsQueryKey(user?.uid, invoiceId),
    enabled: !!user,
    queryFn: async () => {
      const snap = await getDocs(
        query(transactionsCol(user!.uid), where("invoiceId", "==", invoiceId))
      )
      return snap.docs
        .map((d) => mapTransactionDoc(d.id, d.data()))
        .sort((a, b) => (a.date < b.date ? 1 : -1))
    },
  })
}

export function useCreateCardPurchase() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      card,
      values,
      category,
    }: {
      card: Card
      values: CardPurchaseFormValues
      category: Category
    }) => {
      const totalCents = toCents(values.amount)
      const plan = buildInstallmentPlan(totalCents, values.installmentTotal, values.date, card)
      const installmentGroupId = plan.length > 1 ? uuidv4() : undefined

      const invoiceRefs = plan.map((item) =>
        invoiceDocRef(user!.uid, invoiceDocId(card.id, item.referenceMonth))
      )

      await runTransaction(db, async (trx) => {
        // All reads must happen before any writes within a Firestore transaction.
        const invoiceSnaps = await Promise.all(invoiceRefs.map((ref) => trx.get(ref)))
        assertNoInstallmentTargetsPaidInvoice(invoiceSnaps)

        writeInstallmentPlan(trx, user!.uid, card, plan, invoiceRefs, invoiceSnaps, installmentGroupId, {
          description: values.description,
          categoryId: values.categoryId,
          categoryName: category.name,
          categoryColor: category.color,
          categoryIcon: category.icon,
          categoryIconUrl: category.iconUrl ?? null,
          date: values.date,
        })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

/**
 * Efetiva a pending account entry by paying it with a card instead of debiting an
 * account directly. The original doc is kept in place (same date/month) as a checked
 * historical marker — it never counted toward any balance and won't count toward
 * monthly totals from here on — while the real charge(s) land as card-origin
 * transaction(s) on the card's invoice cycle, which is what actually gets totaled
 * and, eventually, paid.
 */
export function useSettleTransactionViaCard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transactionId,
      card,
      installmentTotal,
    }: {
      transactionId: string
      card: Card
      installmentTotal: number
    }) => {
      const uid = user!.uid
      const originalRef = transactionDocRef(uid, transactionId)

      return runTransaction(db, async (trx) => {
        // All reads (original entry + every target invoice) must happen before any writes.
        const originalSnap = await trx.get(originalRef)
        if (!originalSnap.exists()) throw new Error("Lançamento não encontrado")
        const original = originalSnap.data()
        if (original.origin !== "account") throw new Error("Lançamento inválido")
        if (original.settled) throw new Error("Lançamento já efetivado")
        if (original.direction !== "out") {
          throw new Error("Só é possível pagar despesas com cartão de crédito")
        }

        const totalCents = original.amountCents as number
        const purchaseDate = original.date as string
        const plan = buildInstallmentPlan(totalCents, installmentTotal, purchaseDate, card)
        const installmentGroupId = plan.length > 1 ? uuidv4() : undefined

        const invoiceRefs = plan.map((item) =>
          invoiceDocRef(uid, invoiceDocId(card.id, item.referenceMonth))
        )
        const invoiceSnaps = await Promise.all(invoiceRefs.map((ref) => trx.get(ref)))
        assertNoInstallmentTargetsPaidInvoice(invoiceSnaps)

        const written = writeInstallmentPlan(
          trx,
          uid,
          card,
          plan,
          invoiceRefs,
          invoiceSnaps,
          installmentGroupId,
          {
            description: original.description as string,
            categoryId: original.categoryId as string,
            categoryName: original.categoryName as string,
            categoryColor: original.categoryColor as string,
            categoryIcon: (original.categoryIcon as string | undefined) ?? DEFAULT_ICON_NAME,
            categoryIconUrl: (original.categoryIconUrl as string | null | undefined) ?? null,
            date: purchaseDate,
          }
        )

        // Keep the original entry in place (same date/month) as a checked marker
        // pointing at where the real charge landed, instead of deleting it. The full
        // list of resulting transaction ids is what makes "estornar" possible later.
        trx.update(originalRef, {
          settled: true,
          settledVia: "card",
          linkedCardId: card.id,
          linkedInvoiceId: written[0].invoiceId,
          linkedTransactionIds: written.map((w) => w.transactionId),
          updatedAt: serverTimestamp(),
        })

        return { competenceMonths: written.map((w) => w.competenceMonth) }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

/**
 * Reverses a card-settled account entry: deletes the card transaction(s) it created,
 * decrements the affected invoice(s) accordingly, and restores the original entry to
 * pending — the mirror image of useSettleTransactionViaCard. Blocked if any affected
 * invoice has already been paid, same as deleting a card transaction directly.
 */
export function useReverseCardSettlement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const uid = user!.uid
      const originalRef = transactionDocRef(uid, transactionId)

      await runTransaction(db, async (trx) => {
        const originalSnap = await trx.get(originalRef)
        if (!originalSnap.exists()) throw new Error("Lançamento não encontrado")
        const original = originalSnap.data()
        if (original.settledVia !== "card") {
          throw new Error("Este lançamento não foi pago com cartão")
        }

        const linkedIds = (original.linkedTransactionIds as string[] | undefined) ?? []
        const cardTxRefs = linkedIds.map((id) => transactionDocRef(uid, id))
        const cardTxSnaps = await Promise.all(cardTxRefs.map((ref) => trx.get(ref)))

        // An installment may already be gone if the user deleted it directly from the
        // invoice page — reverse whichever of the linked transactions still exist.
        const existing = cardTxSnaps
          .map((snap, i) => ({ snap, ref: cardTxRefs[i] }))
          .filter((entry): entry is { snap: DocumentSnapshot; ref: DocumentReference } =>
            entry.snap.exists()
          )

        const invoiceIds = Array.from(
          new Set(existing.map(({ snap }) => snap.data()!.invoiceId as string))
        )
        const invoiceRefs = invoiceIds.map((id) => invoiceDocRef(uid, id))
        const invoiceSnaps = await Promise.all(invoiceRefs.map((ref) => trx.get(ref)))

        if (invoiceSnaps.some((snap) => snap.exists() && snap.data()!.status === "paid")) {
          throw new Error("Não é possível estornar: uma das faturas já foi paga")
        }

        const decrementByInvoiceId = new Map<string, number>()
        for (const { snap } of existing) {
          const data = snap.data()!
          const invoiceId = data.invoiceId as string
          const amountCents = data.amountCents as number
          decrementByInvoiceId.set(invoiceId, (decrementByInvoiceId.get(invoiceId) ?? 0) + amountCents)
        }

        invoiceRefs.forEach((ref) => {
          const dec = decrementByInvoiceId.get(ref.id)
          if (dec) {
            trx.update(ref, { totalAmountCents: increment(-dec), updatedAt: serverTimestamp() })
          }
        })

        existing.forEach(({ ref }) => trx.delete(ref))

        trx.update(originalRef, {
          settled: false,
          settledVia: deleteField(),
          linkedCardId: deleteField(),
          linkedInvoiceId: deleteField(),
          linkedTransactionIds: deleteField(),
          updatedAt: serverTimestamp(),
        })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

/**
 * Edits a single card-origin transaction line (description, category, amount, date).
 * Doesn't touch installmentGroupId/Number/Total — re-parceling isn't supported here.
 * If the new date resolves to a different invoice cycle, moves the doc between
 * invoices (creating the target invoice if needed). Blocked if either the current or
 * the target invoice is already paid.
 */
export function useUpdateCardTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transactionId,
      card,
      values,
      category,
    }: {
      transactionId: string
      card: Card
      values: CardTransactionEditFormValues
      category: Category
    }) => {
      const uid = user!.uid
      const txRef = transactionDocRef(uid, transactionId)
      const newAmountCents = toCents(values.amount)

      await runTransaction(db, async (trx) => {
        const txSnap = await trx.get(txRef)
        if (!txSnap.exists()) throw new Error("Lançamento não encontrado")
        const original = txSnap.data()
        if (original.origin !== "card") throw new Error("Lançamento inválido")

        const oldInvoiceRef = invoiceDocRef(uid, original.invoiceId as string)
        const oldInvoiceSnap = await trx.get(oldInvoiceRef)
        if (oldInvoiceSnap.exists() && oldInvoiceSnap.data()!.status === "paid") {
          throw new Error("Não é possível editar um lançamento de uma fatura já paga")
        }

        const referenceMonth = resolveInvoiceCycleForPurchase(values.date, card)
        const newInvoiceId = invoiceDocId(card.id, referenceMonth)
        const sameInvoice = newInvoiceId === original.invoiceId

        const base = {
          description: values.description,
          categoryId: values.categoryId,
          categoryName: category.name,
          categoryColor: category.color,
          categoryIcon: category.icon,
          categoryIconUrl: category.iconUrl ?? null,
          amountCents: newAmountCents,
          date: values.date,
          updatedAt: serverTimestamp(),
        }

        if (sameInvoice) {
          const delta = newAmountCents - (original.amountCents as number)
          if (delta !== 0) {
            trx.update(oldInvoiceRef, { totalAmountCents: increment(delta), updatedAt: serverTimestamp() })
          }
          trx.update(txRef, base)
          return
        }

        const newInvoiceRef = invoiceDocRef(uid, newInvoiceId)
        const newInvoiceSnap = await trx.get(newInvoiceRef)
        if (newInvoiceSnap.exists() && newInvoiceSnap.data()!.status === "paid") {
          throw new Error("A nova data cairia em uma fatura já paga. Ajuste a data.")
        }

        if (oldInvoiceSnap.exists()) {
          trx.update(oldInvoiceRef, {
            totalAmountCents: increment(-(original.amountCents as number)),
            updatedAt: serverTimestamp(),
          })
        }

        const closingDate = computeClosingDate(referenceMonth, card.closingDay)
        const dueDate = computeDueDate(referenceMonth, card.closingDay, card.dueDay)

        if (!newInvoiceSnap.exists()) {
          trx.set(newInvoiceRef, {
            cardId: card.id,
            referenceMonth,
            closingDate,
            dueDate,
            totalAmountCents: newAmountCents,
            status: "open",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else {
          trx.update(newInvoiceRef, {
            totalAmountCents: increment(newAmountCents),
            updatedAt: serverTimestamp(),
          })
        }

        trx.update(txRef, {
          ...base,
          competenceMonth: competenceMonthForInvoice(dueDate),
          invoiceId: newInvoiceRef.id,
        })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export type InvoiceImportItem = {
  description: string
  amountCents: number
  date: string
  category: Category
  installmentNumber?: number
  installmentTotal?: number
}

/**
 * Bulk-imports line items read off a card statement into the invoice the user is
 * viewing — each item becomes its own card transaction on that exact invoice, no
 * cycle math involved for it (the statement itself tells us which month it landed
 * on). When an item is an installment purchase (installmentNumber < installmentTotal),
 * the *subsequent* installments are also created now, one per future invoice cycle
 * (get-or-create, rolling forward one month per installment) — the earlier
 * installments are left untouched since they're already booked on past invoices.
 */
export function useImportInvoiceLineItems() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      invoice,
      card,
      items,
    }: {
      invoice: Invoice
      card: Card
      items: InvoiceImportItem[]
    }) => {
      const uid = user!.uid
      const currentInvoiceRef = invoiceDocRef(uid, invoice.id)
      const currentCompetenceMonth = competenceMonthForInvoice(invoice.dueDate)

      // Every remaining installment (across all parceled items) grouped by the
      // future invoice it lands on — two different purchases can both roll into
      // the same future month, so their invoice writes need to be combined.
      type FutureGroup = {
        referenceMonth: string
        amountCents: number
        docs: { item: InvoiceImportItem; installmentNumber: number }[]
      }
      const futureByInvoiceId = new Map<string, FutureGroup>()
      for (const item of items) {
        if (!item.installmentTotal || !item.installmentNumber) continue
        for (let n = item.installmentNumber + 1; n <= item.installmentTotal; n++) {
          const referenceMonth = addMonths(invoice.referenceMonth, n - item.installmentNumber)
          const id = invoiceDocId(card.id, referenceMonth)
          const group = futureByInvoiceId.get(id)
          if (group) {
            group.amountCents += item.amountCents
            group.docs.push({ item, installmentNumber: n })
          } else {
            futureByInvoiceId.set(id, {
              referenceMonth,
              amountCents: item.amountCents,
              docs: [{ item, installmentNumber: n }],
            })
          }
        }
      }

      const futureInvoiceIds = Array.from(futureByInvoiceId.keys())
      const futureInvoiceRefs = futureInvoiceIds.map((id) => invoiceDocRef(uid, id))

      await runTransaction(db, async (trx) => {
        const currentInvoiceSnap = await trx.get(currentInvoiceRef)
        if (!currentInvoiceSnap.exists()) throw new Error("Fatura não encontrada")
        if (currentInvoiceSnap.data()!.status === "paid") {
          throw new Error("Não é possível importar lançamentos em uma fatura já paga")
        }

        const futureInvoiceSnaps = await Promise.all(futureInvoiceRefs.map((ref) => trx.get(ref)))
        if (futureInvoiceSnaps.some((snap) => snap.exists() && snap.data()!.status === "paid")) {
          throw new Error("Uma das parcelas futuras cairia em uma fatura já paga")
        }

        const currentTotalCents = items.reduce((acc, i) => acc + i.amountCents, 0)
        trx.update(currentInvoiceRef, {
          totalAmountCents: increment(currentTotalCents),
          updatedAt: serverTimestamp(),
        })

        for (const item of items) {
          const txRef = doc(transactionsCol(uid))
          trx.set(txRef, {
            origin: "card",
            direction: "out",
            amountCents: item.amountCents,
            description: item.description,
            categoryId: item.category.id,
            categoryName: item.category.name,
            categoryColor: item.category.color,
            categoryIcon: item.category.icon,
            categoryIconUrl: item.category.iconUrl ?? null,
            date: item.date,
            competenceMonth: currentCompetenceMonth,
            cardId: card.id,
            invoiceId: invoice.id,
            ...(item.installmentTotal && item.installmentTotal > 1
              ? { installmentNumber: item.installmentNumber, installmentTotal: item.installmentTotal }
              : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }

        futureInvoiceIds.forEach((invoiceId, i) => {
          const group = futureByInvoiceId.get(invoiceId)!
          const ref = futureInvoiceRefs[i]
          const snap = futureInvoiceSnaps[i]
          const closingDate = computeClosingDate(group.referenceMonth, card.closingDay)
          const dueDate = computeDueDate(group.referenceMonth, card.closingDay, card.dueDay)
          const competenceMonth = competenceMonthForInvoice(dueDate)

          if (!snap.exists()) {
            trx.set(ref, {
              cardId: card.id,
              referenceMonth: group.referenceMonth,
              closingDate,
              dueDate,
              totalAmountCents: group.amountCents,
              status: "open",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          } else {
            trx.update(ref, {
              totalAmountCents: increment(group.amountCents),
              updatedAt: serverTimestamp(),
            })
          }

          for (const { item, installmentNumber } of group.docs) {
            const txRef = doc(transactionsCol(uid))
            trx.set(txRef, {
              origin: "card",
              direction: "out",
              amountCents: item.amountCents,
              description: item.description,
              categoryId: item.category.id,
              categoryName: item.category.name,
              categoryColor: item.category.color,
              categoryIcon: item.category.icon,
              categoryIconUrl: item.category.iconUrl ?? null,
              date: item.date,
              competenceMonth,
              cardId: card.id,
              invoiceId: ref.id,
              installmentNumber,
              installmentTotal: item.installmentTotal,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          }
        })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export function useDeleteCardTransaction() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ transactionId, invoiceId }: { transactionId: string; invoiceId: string }) => {
      await runTransaction(db, async (trx) => {
        const invoiceRef = invoiceDocRef(user!.uid, invoiceId)
        const txRef = transactionDocRef(user!.uid, transactionId)
        const [invoiceSnap, txSnap] = await Promise.all([trx.get(invoiceRef), trx.get(txRef)])

        if (!txSnap.exists()) return
        if (invoiceSnap.exists() && invoiceSnap.data().status === "paid") {
          throw new Error("Não é possível excluir um lançamento de uma fatura já paga")
        }

        const amountCents = txSnap.data().amountCents as number
        if (invoiceSnap.exists()) {
          trx.update(invoiceRef, {
            totalAmountCents: increment(-amountCents),
            updatedAt: serverTimestamp(),
          })
        }
        trx.delete(txRef)
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice"] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export function usePayInvoice() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoice, card }: { invoice: Invoice; card: Card }) => {
      await runTransaction(db, async (trx) => {
        const invoiceRef = invoiceDocRef(user!.uid, invoice.id)
        const invoiceSnap = await trx.get(invoiceRef)
        if (!invoiceSnap.exists() || invoiceSnap.data().status === "paid") {
          throw new Error("Fatura já paga ou inexistente")
        }
        const totalAmountCents = invoiceSnap.data().totalAmountCents as number
        const today = todayDateString()

        const txRef = doc(transactionsCol(user!.uid))
        trx.set(txRef, {
          origin: "account",
          direction: "out",
          amountCents: totalAmountCents,
          description: `Pagamento fatura — ${card.name} (${invoice.referenceMonth})`,
          categoryId: "",
          categoryName: "Pagamento de fatura",
          categoryColor: card.color,
          categoryIcon: card.icon,
          categoryIconUrl: card.iconUrl ?? null,
          date: today,
          competenceMonth: today.slice(0, 7),
          accountId: card.linkedAccountId,
          // Already reflected in the account balance by the increment() below —
          // unlike a regular lançamento, an invoice payment isn't a pending draft.
          settled: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        trx.update(accountDocRef(user!.uid, card.linkedAccountId), {
          currentBalanceCents: increment(-totalAmountCents),
          updatedAt: serverTimestamp(),
        })

        trx.update(invoiceRef, {
          status: "paid",
          paidAt: serverTimestamp(),
          paidFromAccountId: card.linkedAccountId,
          paidTransactionId: txRef.id,
          updatedAt: serverTimestamp(),
        })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice"] })
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.uid] })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}
