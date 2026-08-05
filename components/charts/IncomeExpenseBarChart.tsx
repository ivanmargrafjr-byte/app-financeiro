import { formatCentsBRL } from "@/lib/domain/money"

export function IncomeExpenseBarChart({
  receitasCents,
  despesasCents,
}: {
  receitasCents: number
  despesasCents: number
}) {
  const max = Math.max(receitasCents, despesasCents, 1)
  const bars = [
    { name: "Receitas", value: receitasCents, fill: "#16a34a" },
    { name: "Despesas", value: despesasCents, fill: "#ef4444" },
  ]

  return (
    <div className="flex h-55 items-end justify-center gap-16">
      {bars.map((bar) => (
        <div key={bar.name} className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium">{formatCentsBRL(bar.value)}</span>
          <div
            className="w-16 rounded-t-md transition-[height]"
            style={{
              height: bar.value > 0 ? `${Math.max((bar.value / max) * 160, 6)}px` : "2px",
              backgroundColor: bar.value > 0 ? bar.fill : "var(--border)",
            }}
          />
          <span className="text-muted-foreground text-sm">{bar.name}</span>
        </div>
      ))}
    </div>
  )
}
