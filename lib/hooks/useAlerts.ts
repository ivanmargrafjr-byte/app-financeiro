"use client"

import { useMemo, useState } from "react"

import { useAccounts } from "@/lib/hooks/useAccounts"
import { useArchivedCards, useCards } from "@/lib/hooks/useCards"
import { useCategories } from "@/lib/hooks/useCategories"
import { useContracts } from "@/lib/hooks/useContracts"
import { useGoals } from "@/lib/hooks/useGoals"
import { useOpenInvoices } from "@/lib/hooks/useInvoices"
import { useBudgets } from "@/lib/hooks/useBudgets"
import { useMonthsTransactions, usePendingTransactions } from "@/lib/hooks/useTransactions"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import {
  alertsFromBudgets,
  alertsFromCashFlow,
  alertsFromContracts,
  alertsFromDuplicates,
  alertsFromGoals,
  alertsFromRecurring,
  sortAlerts,
  type Alert,
  type AlertKind,
} from "@/lib/domain/alerts"
import { buildBudgetLines } from "@/lib/domain/budget"
import { buildCashFlow } from "@/lib/domain/cashFlow"
import { contractsNeedingAttention } from "@/lib/domain/contractLifecycle"
import { addMonths, monthOfDate, todayDateString } from "@/lib/domain/dateUtils"

/**
 * Everything the app can warn about right now, already sorted and with the muted
 * kinds removed.
 *
 * All of it is computed from data the screens already load — the alerts are a
 * reading of the same numbers, not a second source that could disagree with them.
 */
export function useAlerts(): { alerts: Alert[]; isLoading: boolean; muted: AlertKind[] } {
  const [today] = useState(() => todayDateString())
  const currentMonth = monthOfDate(today)
  const months = useMemo(() => [addMonths(currentMonth, -1), currentMonth], [currentMonth])

  const { data: profile } = useUserProfile()
  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: cards } = useCards()
  const { data: archivedCards } = useArchivedCards()
  const { data: categories } = useCategories()
  const { data: openInvoices, isLoading: loadingInvoices } = useOpenInvoices()
  const { data: pending, isLoading: loadingPending } = usePendingTransactions()
  const { data: monthsData, isLoading: loadingMonths } = useMonthsTransactions(months)
  const { data: budgets } = useBudgets()
  const { data: goals } = useGoals()
  const { data: contracts } = useContracts()

  const muted = (profile?.mutedAlertKinds ?? []) as AlertKind[]

  const alerts = useMemo(() => {
    const byMonth = new Map((monthsData ?? []).map((bucket) => [bucket.month, bucket.transactions]))
    const archivedById = new Map((archivedCards ?? []).map((c) => [c.id, c]))
    const cardsById = new Map([...(cards ?? []), ...(archivedCards ?? [])].map((c) => [c.id, c]))
    const activeAccountIds = new Set((accounts ?? []).map((a) => a.id))

    const flow = buildCashFlow({
      today,
      days: 30,
      balanceCents: (accounts ?? []).reduce((total, a) => total + a.currentBalanceCents, 0),
      transactions: (pending ?? []).filter(
        (t) => !t.accountId || activeAccountIds.has(t.accountId)
      ),
      openInvoices: openInvoices ?? [],
      cardsById,
    })

    const lines = buildBudgetLines({
      budgets: budgets ?? [],
      categories: categories ?? [],
      transactions: byMonth.get(currentMonth) ?? [],
      archivedCardsById: archivedById,
      month: currentMonth,
      today,
    })

    return sortAlerts([
      ...alertsFromCashFlow(flow),
      ...alertsFromBudgets(lines),
      ...alertsFromGoals(goals ?? [], today),
      ...alertsFromContracts(contractsNeedingAttention(contracts ?? [], today)),
      ...alertsFromRecurring(
        byMonth.get(currentMonth) ?? [],
        byMonth.get(addMonths(currentMonth, -1)) ?? [],
        currentMonth
      ),
      ...alertsFromDuplicates(byMonth.get(currentMonth) ?? []),
    ]).filter((alert) => !muted.includes(alert.kind))
  }, [
    accounts,
    cards,
    archivedCards,
    categories,
    openInvoices,
    pending,
    monthsData,
    budgets,
    goals,
    contracts,
    currentMonth,
    today,
    muted,
  ])

  return {
    alerts,
    isLoading: loadingAccounts || loadingInvoices || loadingPending || loadingMonths,
    muted,
  }
}
