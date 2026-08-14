import { useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addDoc,
  arrayUnion,
  deleteDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore"

import { useAuth } from "@/lib/auth/AuthProvider"
import { useCategories } from "@/lib/hooks/useCategories"
import { db } from "@/lib/firebase/client"
import {
  accountDocRef,
  recurringRuleDocRef,
  recurringRulesCol,
  transactionDocRef,
  transactionsCol,
} from "@/lib/firebase/paths"
import { tsToMillis } from "@/lib/firebase/timestamp"
import { occurrenceDateForMonth, recurringOccurrenceId, ruleAppliesToMonth } from "@/lib/domain/recurring"
import {
  dispositionForOccurrence,
  type RuleRange,
} from "@/lib/domain/recurringPropagation"
import { currentMonthString } from "@/lib/domain/dateUtils"
import { toCents } from "@/lib/domain/money"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"
import type { MonthString } from "@/lib/domain/dateUtils"
import type { Category, RecurringRule } from "@/lib/types"
import type { RecurringRuleFormValues } from "@/lib/validators/recurringRule"

function signedAmount(direction: "in" | "out", amountCents: number) {
  return direction === "in" ? amountCents : -amountCents
}

function mapRuleDoc(id: string, data: Record<string, unknown>): RecurringRule {
  return {
    id,
    description: data.description as string,
    amountCents: data.amountCents as number,
    categoryId: data.categoryId as string,
    accountId: data.accountId as string,
    direction: data.direction as RecurringRule["direction"],
    dayOfMonth: data.dayOfMonth as number,
    startMonth: data.startMonth as string,
    endMonth: (data.endMonth as string | null) ?? null,
    active: data.active as boolean,
    excludedMonths: (data.excludedMonths as string[]) ?? [],
    createdAt: tsToMillis(data.createdAt),
    updatedAt: tsToMillis(data.updatedAt),
  }
}

function rulesQueryKey(uid: string | undefined) {
  return ["recurringRules", uid]
}

export function useRecurringRules() {
  const { user } = useAuth()

  return useQuery({
    queryKey: rulesQueryKey(user?.uid),
    enabled: !!user,
    queryFn: async (): Promise<RecurringRule[]> => {
      const snap = await getDocs(recurringRulesCol(user!.uid))
      return snap.docs
        .map((d) => mapRuleDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt - a.createdAt)
    },
  })
}

export function useCreateRecurringRule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: RecurringRuleFormValues) => {
      await addDoc(recurringRulesCol(user!.uid), {
        description: values.description,
        amountCents: toCents(values.amount),
        direction: values.direction,
        categoryId: values.categoryId,
        accountId: values.accountId,
        dayOfMonth: values.dayOfMonth,
        startMonth: values.startMonth,
        endMonth: values.endMonth || null,
        active: true,
        excludedMonths: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rulesQueryKey(user?.uid) }),
  })
}

/**
 * Brings a rule's already-materialized months back in line with the rule itself:
 * rewrites the ones it still covers, removes the ones it no longer does (switched off,
 * or outside a start/end that moved), and leaves settled and past months untouched.
 * Deletion only ever reaches unsettled months, so no account balance moves.
 */
async function reconcileOccurrences(
  uid: string,
  ruleId: string,
  options: {
    range: RuleRange
    buildUpdate?: (competenceMonth: MonthString) => Record<string, unknown>
  }
) {
  const currentMonth = currentMonthString()
  const occurrences = await getDocs(
    query(transactionsCol(uid), where("recurringSeriesId", "==", ruleId))
  )

  await Promise.all(
    occurrences.docs.map((d) => {
      const competenceMonth = d.data().competenceMonth as MonthString
      const disposition = dispositionForOccurrence(
        { competenceMonth, settled: (d.data().settled as boolean | undefined) ?? false },
        options.range,
        currentMonth
      )

      if (disposition === "delete") return deleteDoc(d.ref)
      if (disposition === "update" && options.buildUpdate) {
        return updateDoc(d.ref, options.buildUpdate(competenceMonth))
      }
      return Promise.resolve()
    })
  )
}

export function useUpdateRecurringRule() {
  const { user } = useAuth()
  const { data: categories } = useCategories()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: RecurringRuleFormValues }) => {
      const amountCents = toCents(values.amount)
      await updateDoc(recurringRuleDocRef(user!.uid, id), {
        description: values.description,
        amountCents,
        direction: values.direction,
        categoryId: values.categoryId,
        accountId: values.accountId,
        dayOfMonth: values.dayOfMonth,
        startMonth: values.startMonth,
        endMonth: values.endMonth || null,
        updatedAt: serverTimestamp(),
      })

      // Nothing else reads the rule doc: every month was materialized as its own
      // lançamento, and generation skips any that already exists. Without this the
      // rule would say R$ 16.300 while all twelve months on screen still said 15.900.
      const category = categories?.find((c) => c.id === values.categoryId)
      await reconcileOccurrences(user!.uid, id, {
        range: {
          active: true,
          startMonth: values.startMonth,
          endMonth: values.endMonth || null,
        },
        // Shrinking the range leaves months the rule no longer covers; those get
        // removed rather than rewritten.
        buildUpdate: (competenceMonth) => {
          const update: Record<string, unknown> = {
            description: values.description,
            amountCents,
            direction: values.direction,
            accountId: values.accountId,
            date: occurrenceDateForMonth(values.dayOfMonth, competenceMonth),
            updatedAt: serverTimestamp(),
          }
          // Categories are denormalized onto each lançamento. Only rewrite them when
          // the category is actually in hand, so a not-yet-loaded list can't blank
          // out the name and colour of every occurrence.
          if (category) {
            update.categoryId = category.id
            update.categoryName = category.name
            update.categoryColor = category.color
            update.categoryIcon = category.icon
            update.categoryIconUrl = category.iconUrl ?? null
          }
          return update
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey(user?.uid) })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export function useDeactivateRecurringRule() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(recurringRuleDocRef(user!.uid, id), {
        active: false,
        updatedAt: serverTimestamp(),
      })
      // Switching a rule off has to take its pending future months with it — they were
      // already materialized, and would otherwise keep inflating the totals for years.
      await reconcileOccurrences(user!.uid, id, { range: { active: false } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey(user?.uid) })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

/** Deletes a single month's generated occurrence and marks that month excluded so it never regenerates. */
export function useDeleteRecurringOccurrence() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ruleId, month }: { ruleId: string; month: MonthString }) => {
      const occurrenceId = recurringOccurrenceId(ruleId, month)
      await runTransaction(db, async (trx) => {
        const txRef = transactionDocRef(user!.uid, occurrenceId)
        const txSnap = await trx.get(txRef)
        const ruleRef = recurringRuleDocRef(user!.uid, ruleId)

        if (txSnap.exists()) {
          const data = txSnap.data()
          const wasSettled = (data.settled as boolean | undefined) ?? true
          if (wasSettled) {
            trx.update(accountDocRef(user!.uid, data.accountId as string), {
              currentBalanceCents: increment(-signedAmount(data.direction, data.amountCents)),
              updatedAt: serverTimestamp(),
            })
          }
          trx.delete(txRef)
        }
        trx.update(ruleRef, { excludedMonths: arrayUnion(month), updatedAt: serverTimestamp() })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesQueryKey(user?.uid) })
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.uid] })
    },
  })
}

/**
 * Lazily materializes this month's occurrence for every active rule that applies to it.
 * Idempotent: generation never overwrites an existing (possibly user-edited) occurrence doc.
 */
export async function generateRecurringOccurrencesForMonth(
  uid: string,
  month: MonthString,
  rules: RecurringRule[],
  categories: Category[]
) {
  const applicable = rules.filter((rule) => ruleAppliesToMonth(rule, month))

  for (const rule of applicable) {
    const occurrenceId = recurringOccurrenceId(rule.id, month)
    const txRef = transactionDocRef(uid, occurrenceId)
    const category = categories.find((c) => c.id === rule.categoryId)

    await runTransaction(db, async (trx) => {
      const snap = await trx.get(txRef)
      if (snap.exists()) return

      const date = occurrenceDateForMonth(rule.dayOfMonth, month)
      trx.set(txRef, {
        origin: "account",
        direction: rule.direction,
        amountCents: rule.amountCents,
        description: rule.description,
        categoryId: rule.categoryId,
        categoryName: category?.name ?? "",
        categoryColor: category?.color ?? "#64748b",
        categoryIcon: category?.icon ?? DEFAULT_ICON_NAME,
        categoryIconUrl: category?.iconUrl ?? null,
        date,
        competenceMonth: month,
        accountId: rule.accountId,
        recurringSeriesId: rule.id,
        // Generated occurrences start pending too — the user must efetivar them
        // manually, same as any other lançamento.
        settled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  }
}

/**
 * Runs recurring-occurrence generation once per (uid, month) whenever the viewed month
 * changes, so navigating to a future month materializes its recurring transactions
 * without the user having to do anything.
 */
export function useEnsureRecurringGenerated(month: MonthString) {
  const { user } = useAuth()
  const { data: rules } = useRecurringRules()
  const { data: categories } = useCategories()
  const queryClient = useQueryClient()
  const generatedKey = useRef<string | null>(null)

  useEffect(() => {
    if (!user || !rules || !categories) return
    const key = `${user.uid}:${month}`
    if (generatedKey.current === key) return
    generatedKey.current = key

    generateRecurringOccurrencesForMonth(user.uid, month, rules, categories).then(() => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["accounts", user.uid] })
    })
  }, [user, rules, categories, month, queryClient])
}
