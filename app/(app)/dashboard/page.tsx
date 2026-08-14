"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryPieChart, type CategorySlice } from "@/components/charts/CategoryPieChart"
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { useMonth } from "@/lib/month/MonthProvider"
import { useMonthTransactions } from "@/lib/hooks/useTransactions"
import { useArchivedCards } from "@/lib/hooks/useCards"
import { cardCountsInMonth } from "@/lib/domain/cardCutoff"
import { formatCentsBRL } from "@/lib/domain/money"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"

export default function DashboardPage() {
  const { month } = useMonth()
  const { data: transactions, isLoading } = useMonthTransactions(month)
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
    const txs = (transactions ?? []).filter(
      (t) =>
        t.settledVia !== "card" &&
        !t.isInvoicePayment &&
        t.origin !== "transfer" &&
        t.origin !== "adjustment" &&
        cardCountsInMonth(archivedById.get(t.cardId ?? ""), t.competenceMonth)
    )
    const receitasCents = txs
      .filter((t) => t.direction === "in")
      .reduce((acc, t) => acc + t.amountCents, 0)
    const despesasCents = txs
      .filter((t) => t.direction === "out")
      .reduce((acc, t) => acc + t.amountCents, 0)

    const byCategory = new Map<string, CategorySlice>()
    for (const t of txs) {
      if (t.direction !== "out") continue
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
      porCategoria: Array.from(byCategory.values()).sort(
        (a, b) => b.amountCents - a.amountCents
      ),
    }
  }, [transactions, archivedCards])

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
              Saldo do mês
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
            <IncomeExpenseBarChart
              receitasCents={summary.receitasCents}
              despesasCents={summary.despesasCents}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={summary.porCategoria} />
          </CardContent>
        </Card>
      </div>

      {summary.porCategoria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Detalhe por categoria</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            {summary.porCategoria.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <EntityIcon name={c.icon} color={c.color} imageUrl={c.iconUrl} />
                  {c.name}
                </span>
                <span className="font-medium">{formatCentsBRL(c.amountCents)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
