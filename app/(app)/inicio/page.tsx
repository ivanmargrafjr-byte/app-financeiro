"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BalanceCard, OpenInvoicesCard } from "@/components/home/BalanceCards"
import { MonthFlowCard } from "@/components/home/MonthFlowCard"
import { UpcomingCard } from "@/components/home/UpcomingCard"
import { TrialBanner } from "@/components/home/TrialBanner"
import { useMonth } from "@/lib/month/MonthProvider"
import { useAccounts } from "@/lib/hooks/useAccounts"
import { useArchivedCards, useCards } from "@/lib/hooks/useCards"
import { useOpenInvoices } from "@/lib/hooks/useInvoices"
import { useMonthsTransactions } from "@/lib/hooks/useTransactions"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useNow } from "@/lib/hooks/useNow"
import {
  getHiddenValues,
  getHiddenValuesOnServer,
  subscribeHiddenValues,
  toggleHiddenValues,
} from "@/lib/ui/hiddenValues"
import { sumMonthFlow } from "@/lib/domain/monthlyTotals"
import { trialDaysRemaining } from "@/lib/domain/subscriptionAccess"
import {
  buildUpcoming,
  countsAsOpenInvoice,
  projectBalanceToMonthEnd,
  sumOpenInvoicesCents,
  UPCOMING_DAYS,
} from "@/lib/domain/homeSummary"
import {
  addDays,
  addMonths,
  currentMonthString,
  monthLabel,
  monthOfDate,
  todayDateString,
} from "@/lib/domain/dateUtils"

function greeting(hour: number): string {
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

export default function InicioPage() {
  const { month } = useMonth()
  const { data: profile } = useUserProfile()
  const now = useNow()

  // Frozen for the life of the screen: recomputing on every render would make the
  // window silently slide mid-session and the memos below churn.
  const [today] = useState(() => todayDateString())
  const [hello] = useState(() => greeting(new Date().getHours()))

  const hidden = useSyncExternalStore(
    subscribeHiddenValues,
    getHiddenValues,
    getHiddenValuesOnServer
  )

  const currentMonth = monthOfDate(today)
  const upcomingEndMonth = monthOfDate(addDays(today, UPCOMING_DAYS))
  // The Fluxo card follows the month switcher; everything else is anchored to today.
  // The previous month is fetched too, so a bill that went past its date and was
  // never checked still weighs on the projection.
  const months = useMemo(
    () =>
      Array.from(
        new Set([addMonths(currentMonth, -1), currentMonth, upcomingEndMonth, month])
      ),
    [currentMonth, upcomingEndMonth, month]
  )

  const { data: monthsData, isLoading: loadingTransactions } = useMonthsTransactions(months)
  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: cards, isLoading: loadingCards } = useCards()
  const { data: archivedCards, isLoading: loadingArchived } = useArchivedCards()
  const { data: openInvoices, isLoading: loadingInvoices } = useOpenInvoices()

  const isLoading =
    loadingTransactions || loadingAccounts || loadingCards || loadingArchived || loadingInvoices

  const summary = useMemo(() => {
    const byMonth = new Map((monthsData ?? []).map((bucket) => [bucket.month, bucket.transactions]))
    const archivedById = new Map((archivedCards ?? []).map((c) => [c.id, c]))
    const cardsById = new Map([...(cards ?? []), ...(archivedCards ?? [])].map((c) => [c.id, c]))

    const balanceCents = (accounts ?? []).reduce((total, a) => total + a.currentBalanceCents, 0)

    const invoices = (openInvoices ?? []).filter((i) => countsAsOpenInvoice(i, cardsById))
    const invoicesCents = sumOpenInvoicesCents(openInvoices ?? [], cardsById)

    const flow = sumMonthFlow(byMonth.get(month) ?? [], archivedById)

    // Deliberately not "every month fetched": which months those are depends on where
    // the user paged to, and a projection that moved with browsing wouldn't be one.
    const currentAndPrevious = [
      ...(byMonth.get(addMonths(currentMonth, -1)) ?? []),
      ...(byMonth.get(currentMonth) ?? []),
    ]

    return {
      balanceCents,
      invoicesCents,
      invoiceCount: invoices.length,
      nextDueDate: invoices[0]?.dueDate ?? null,
      flow,
      projection: projectBalanceToMonthEnd({
        today,
        balanceCents,
        transactions: currentAndPrevious,
      }),
      upcoming: buildUpcoming({
        today,
        transactions: [
          ...(byMonth.get(currentMonth) ?? []),
          ...(upcomingEndMonth === currentMonth ? [] : (byMonth.get(upcomingEndMonth) ?? [])),
        ],
        openInvoices: openInvoices ?? [],
        cardsById,
      }),
    }
  }, [monthsData, accounts, cards, archivedCards, openInvoices, month, currentMonth, upcomingEndMonth, today])

  const firstName = profile?.displayName?.trim().split(/\s+/)[0]

  // "Fluxo de agosto" reads better than "de agosto de 2026"; the year only earns its
  // place once the user has paged out of the current one.
  const flowMonthName = useMemo(() => {
    const label = monthLabel(month)
    return month.slice(0, 4) === today.slice(0, 4) ? label.replace(/ de \d{4}$/, "") : label
  }, [month, today])

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {hello}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleHiddenValues}
          aria-pressed={hidden}
          aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
        >
          {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>

      {profile?.subscriptionStatus === "free_trial" && (
        <TrialBanner daysLeft={trialDaysRemaining(profile, now)} />
      )}

      <BalanceCard
        balanceCents={summary.balanceCents}
        freeCents={summary.balanceCents - summary.invoicesCents}
        hidden={hidden}
      />

      <OpenInvoicesCard
        totalCents={summary.invoicesCents}
        invoiceCount={summary.invoiceCount}
        nextDueDate={summary.nextDueDate}
        today={today}
        hidden={hidden}
      />

      <MonthFlowCard
        monthName={flowMonthName}
        receitasCents={summary.flow.receitasCents}
        despesasCents={summary.flow.despesasCents}
        projection={month === currentMonthString() ? summary.projection : null}
        hidden={hidden}
      />

      <UpcomingCard items={summary.upcoming} days={UPCOMING_DAYS} hidden={hidden} />
    </div>
  )
}
