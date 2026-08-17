import { formatCentsBRL } from "@/lib/domain/money"
import { shortMonthLabel, type MonthString } from "@/lib/domain/dateUtils"

export type MonthTotals = {
  month: MonthString
  receitasCents: number
  despesasCents: number
}

const RECEITA_FILL = "#16a34a"
const DESPESA_FILL = "#ef4444"
const MAX_BAR_HEIGHT = 160

export function IncomeExpenseBarChart({ series }: { series: MonthTotals[] }) {
  // One month keeps the old roomy look; six have to share the same width, so the bars
  // narrow and the per-bar figures drop away — the month label and legend carry it.
  const single = series.length === 1
  const max = Math.max(
    1,
    ...series.flatMap((m) => [m.receitasCents, m.despesasCents])
  )

  return (
    <div className="grid gap-3">
      <div className="flex h-55 items-end justify-center gap-4 sm:gap-6">
        {series.map((entry) => (
          <div key={entry.month} className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-1.5">
              {[
                { value: entry.receitasCents, fill: RECEITA_FILL },
                { value: entry.despesasCents, fill: DESPESA_FILL },
              ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  {single && (
                    <span className="text-sm font-medium">{formatCentsBRL(bar.value)}</span>
                  )}
                  <div
                    className={single ? "w-16 rounded-t-md" : "w-5 rounded-t-md sm:w-7"}
                    style={{
                      height:
                        bar.value > 0 ? `${Math.max((bar.value / max) * MAX_BAR_HEIGHT, 6)}px` : "2px",
                      backgroundColor: bar.value > 0 ? bar.fill : "var(--border)",
                    }}
                  />
                </div>
              ))}
            </div>
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {shortMonthLabel(entry.month)}
            </span>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground flex items-center justify-center gap-4 text-xs">
        {[
          { label: "Receitas", fill: RECEITA_FILL },
          { label: "Despesas", fill: DESPESA_FILL },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: item.fill }}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
