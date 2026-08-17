"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { formatCentsBRL } from "@/lib/domain/money"
import { shortMonthLabel } from "@/lib/domain/dateUtils"
import type { CategorySlice } from "@/components/charts/CategoryPieChart"
import type { Transaction } from "@/lib/types"

function formatDay(date: string): string {
  const [, month, day] = date.split("-")
  return day && month ? `${day}/${month}` : date
}

/**
 * The lançamentos behind one slice of "Gastos por categoria" — the answer to "R$ 4.200
 * on Mercado, but *what* exactly?". Spans the whole dashboard period, so each row
 * carries its month when more than one is in view.
 */
export function CategoryTransactionsDialog({
  category,
  transactions,
  periodLabel,
  showMonth,
  onClose,
}: {
  category: CategorySlice | null
  transactions: Transaction[]
  periodLabel: string
  showMonth: boolean
  onClose: () => void
}) {
  const total = transactions.reduce((sum, t) => sum + t.amountCents, 0)

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          {/* pr-8 keeps a long category name clear of the absolutely-positioned
              close button sitting in the corner. */}
          <DialogTitle className="flex items-center gap-2 pr-8 text-sm">
            {category && (
              <EntityIcon
                name={category.icon}
                color={category.color}
                imageUrl={category.iconUrl}
              />
            )}
            <span className="truncate">{category?.name ?? ""}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <div className="text-muted-foreground flex items-baseline justify-between gap-2 text-xs">
            <span>
              {transactions.length}{" "}
              {transactions.length === 1 ? "lançamento" : "lançamentos"} · {periodLabel}
            </span>
            <span className="text-foreground shrink-0 text-sm font-semibold">
              {formatCentsBRL(total)}
            </span>
          </div>

          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-xs">Nenhum lançamento no período.</p>
          ) : (
            <div className="grid gap-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="border-border flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs">{tx.description}</span>
                    <span className="text-muted-foreground text-[0.6875rem]">
                      {formatDay(tx.date)}
                      {showMonth && ` · ${shortMonthLabel(tx.competenceMonth)}`}
                      {tx.installmentTotal
                        ? ` · parcela ${tx.installmentNumber}/${tx.installmentTotal}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium tabular-nums">
                    {formatCentsBRL(tx.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
