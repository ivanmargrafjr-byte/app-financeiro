import { AlertTriangle, TrendingDown } from "lucide-react"

import { Amount } from "@/components/home/Amount"
import { formatDateBR } from "@/lib/domain/dateUtils"
import type { CashFlow } from "@/lib/domain/cashFlow"

/** The two days worth naming: the tightest one, and the first one in the red. */
export function CashFlowSummary({
  flow,
  days,
  hidden = false,
}: {
  flow: CashFlow
  days: number
  hidden?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
      <div className="bg-muted grid gap-0.5 rounded-lg p-3">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <TrendingDown className="size-3.5" />
          Menor saldo previsto
        </span>
        <Amount
          cents={flow.lowest.cents}
          hidden={hidden}
          size="sm"
          className={flow.lowest.cents < 0 ? "text-destructive" : undefined}
        />
        <span className="text-muted-foreground text-xs">em {formatDateBR(flow.lowest.date)}</span>
      </div>
      <div className="bg-muted grid gap-0.5 rounded-lg p-3">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <AlertTriangle className="size-3.5" />
          Primeiro dia no vermelho
        </span>
        {flow.firstNegative ? (
          <>
            <span className="text-destructive text-sm font-medium">
              {formatDateBR(flow.firstNegative.date)}
            </span>
            <span className="text-muted-foreground text-xs">
              o saldo não cobre o que vence até lá
            </span>
          </>
        ) : (
          <>
            <span className="text-sm font-medium">Nenhum</span>
            <span className="text-muted-foreground text-xs">
              o saldo se mantém positivo em {days} dias
            </span>
          </>
        )}
      </div>
    </div>
  )
}
