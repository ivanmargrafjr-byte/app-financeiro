"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CategoryPieChart, type CategorySlice } from "@/components/charts/CategoryPieChart"
import { IncomeExpenseBarChart } from "@/components/charts/IncomeExpenseBarChart"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { useMonth } from "@/lib/month/MonthProvider"
import { useMonthTransactions } from "@/lib/hooks/useTransactions"
import { formatCentsBRL } from "@/lib/domain/money"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"

export default function DashboardPage() {
  const { month } = useMonth()
  const { data: transactions, isLoading } = useMonthTransactions(month)

  const summary = useMemo(() => {
    // Entries paid via card keep their original doc as a checked historical marker,
    // but the amount that actually counts lives in the card transaction on the
    // invoice's due month — skip the marker here to avoid counting it twice.
    const txs = (transactions ?? []).filter((t) => t.settledVia !== "card")
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
  }, [transactions])

  if (isLoading) {
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
    <div className="grid gap-4">
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
          <CardContent className="grid gap-2">
            {summary.porCategoria.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <EntityIcon name={c.icon} color={c.color} />
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
