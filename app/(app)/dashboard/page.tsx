"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryPieChart, type CategorySlice } from "@/components/charts/CategoryPieChart"
import { IncomeExpenseBarChart, type MonthTotals } from "@/components/charts/IncomeExpenseBarChart"
import { CategoryTransactionsDialog } from "@/components/dashboard/CategoryTransactionsDialog"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { useMonth } from "@/lib/month/MonthProvider"
import { useMonthsTransactions } from "@/lib/hooks/useTransactions"
import { useArchivedCards } from "@/lib/hooks/useCards"
import { cardCountsInMonth } from "@/lib/domain/cardCutoff"
import {
  monthsInPeriod,
  PERIOD_LABELS,
  PERIOD_LENGTHS,
  type PeriodLength,
} from "@/lib/domain/dashboardPeriod"
import { monthLabel, shortMonthLabel } from "@/lib/domain/dateUtils"
import { formatCentsBRL } from "@/lib/domain/money"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"
import type { Transaction } from "@/lib/types"

export default function DashboardPage() {
  const { month } = useMonth()
  const [periodLength, setPeriodLength] = useState<PeriodLength>(1)
  const [selectedCategory, setSelectedCategory] = useState<CategorySlice | null>(null)

  const months = useMemo(() => monthsInPeriod(month, periodLength), [month, periodLength])
  const { data: monthsData, isLoading } = useMonthsTransactions(months)
  // Needed to apply each archived card's cutoff below. Its loading state gates the
  // skeleton too, so the totals never flash the pre-cutoff (inflated) figure first.
  const { data: archivedCards, isLoading: isLoadingArchivedCards } = useArchivedCards()

  const summary = useMemo(() => {
    const archivedById = new Map((archivedCards ?? []).map((c) => [c.id, c]))

    // Entries paid via card keep their original doc as a checked historical marker,
    // but the amount that actually counts lives in the card transaction on the
    // invoice's due month — skip the marker here to avoid counting it twice.
    // Invoice payments move money already counted via the invoice's card-origin
    // purchases out of the account — also excluded to avoid double counting.
    // Transfers move money between the user's own accounts, and balance adjustments
    // are corrections whose effect is already in each account's current balance —
    // both neutral, excluded here.
    // A card replaced by a new one keeps its old entries for the months only it
    // recorded, but from its cutoff month on they are a stale duplicate of what the
    // replacement carries — see lib/domain/cardCutoff.ts.
    const counts = (t: Transaction) =>
      t.settledVia !== "card" &&
      !t.isInvoicePayment &&
      t.origin !== "transfer" &&
      t.origin !== "adjustment" &&
      cardCountsInMonth(archivedById.get(t.cardId ?? ""), t.competenceMonth)

    const perMonth: MonthTotals[] = []
    const expenses: Transaction[] = []
    let receitasCents = 0
    let despesasCents = 0

    for (const bucket of monthsData ?? []) {
      const txs = bucket.transactions.filter(counts)
      const receitas = txs
        .filter((t) => t.direction === "in")
        .reduce((acc, t) => acc + t.amountCents, 0)
      const despesas = txs
        .filter((t) => t.direction === "out")
        .reduce((acc, t) => acc + t.amountCents, 0)

      perMonth.push({ month: bucket.month, receitasCents: receitas, despesasCents: despesas })
      expenses.push(...txs.filter((t) => t.direction === "out"))
      receitasCents += receitas
      despesasCents += despesas
    }

    const byCategory = new Map<string, CategorySlice>()
    for (const t of expenses) {
      const existing = byCategory.get(t.categoryId)
      if (existing) {
        existing.amountCents += t.amountCents
      } else {
        byCategory.set(t.categoryId, {
          categoryId: t.categoryId || "sem-categoria",
          name: t.categoryName || "Sem categoria",
          icon: t.categoryIcon || DEFAULT_ICON_NAME,
          iconUrl: t.categoryIconUrl,
          color: t.categoryColor || "#64748b",
          amountCents: t.amountCents,
        })
      }
    }

    return {
      receitasCents,
      despesasCents,
      saldoCents: receitasCents - despesasCents,
      perMonth,
      expenses,
      porCategoria: Array.from(byCategory.values()).sort(
        (a, b) => b.amountCents - a.amountCents
      ),
    }
  }, [monthsData, archivedCards])

  const multiMonth = months.length > 1
  const periodLabel = multiMonth
    ? `${shortMonthLabel(months[0])} – ${shortMonthLabel(months[months.length - 1])}`
    : monthLabel(month)

  const selectedTransactions = useMemo(
    () =>
      selectedCategory
        ? summary.expenses.filter((t) => t.categoryId === selectedCategory.categoryId)
        : [],
    [selectedCategory, summary.expenses]
  )

  const periodPicker = (
    <div className="flex gap-1">
      {PERIOD_LENGTHS.map((length) => (
        <Button
          key={length}
          size="sm"
          variant={length === periodLength ? "secondary" : "ghost"}
          onClick={() => setPeriodLength(length)}
        >
          {PERIOD_LABELS[length]}
        </Button>
      ))}
    </div>
  )

  if (isLoading || isLoadingArchivedCards) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
        <Skeleton className="h-72 sm:col-span-3" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{periodLabel}</p>
        {periodPicker}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">
              {formatCentsBRL(summary.receitasCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCentsBRL(summary.despesasCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {multiMonth ? "Saldo do período" : "Saldo do mês"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={
                "text-2xl font-semibold " +
                (summary.saldoCents >= 0 ? "text-emerald-600" : "text-destructive")
              }
            >
              {formatCentsBRL(summary.saldoCents)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Receitas x Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseBarChart series={summary.perMonth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart
              data={summary.porCategoria}
              onSelect={setSelectedCategory}
              emptyLabel={
                multiMonth
                  ? "Sem despesas categorizadas no período."
                  : "Sem despesas categorizadas neste mês."
              }
            />
          </CardContent>
        </Card>
      </div>

      {summary.porCategoria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Detalhe por categoria</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-1">
            {summary.porCategoria.map((c) => (
              <button
                key={c.categoryId}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
              >
                <span className="flex items-center gap-2">
                  <EntityIcon name={c.icon} color={c.color} imageUrl={c.iconUrl} />
                  {c.name}
                </span>
                <span className="font-medium">{formatCentsBRL(c.amountCents)}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <CategoryTransactionsDialog
        category={selectedCategory}
        transactions={selectedTransactions}
        periodLabel={periodLabel}
        showMonth={multiMonth}
        onClose={() => setSelectedCategory(null)}
      />
    </div>
  )
}
