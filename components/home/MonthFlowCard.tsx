import Link from "next/link"
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Amount } from "@/components/home/Amount"
import { formatDateBR } from "@/lib/domain/dateUtils"

export function MonthFlowCard({
  monthName,
  receitasCents,
  despesasCents,
  projection,
  hidden,
}: {
  monthName: string
  receitasCents: number
  despesasCents: number
  /**
   * Where the balance lands by the end of the month if every pending entry holds.
   * Null while the user is browsing another month — a projection for a month they
   * merely paged to would read as a statement about their money and isn't one.
   */
  projection: { throughDate: string; cents: number } | null
  hidden: boolean
}) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <Link
          href="/dashboard"
          className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline"
        >
          Fluxo de {monthName.toLowerCase()}
          <ChevronRight className="size-3.5" />
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 grid gap-0.5 rounded-lg p-3">
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <ArrowDownLeft className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              Entradas
            </span>
            <Amount
              cents={receitasCents}
              hidden={hidden}
              size="md"
              className="text-emerald-600 dark:text-emerald-400"
            />
          </div>
          <div className="bg-muted/50 grid gap-0.5 rounded-lg p-3">
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <ArrowUpRight className="text-destructive size-3.5" />
              Saídas
            </span>
            <Amount
              cents={despesasCents}
              hidden={hidden}
              size="md"
              className="text-destructive"
            />
          </div>
        </div>

        {projection && (
          <p className="text-muted-foreground text-sm">
            Saldo projetado até {formatDateBR(projection.throughDate)}:{" "}
            <Amount
              cents={projection.cents}
              hidden={hidden}
              size="sm"
              className={projection.cents < 0 ? "text-destructive" : "text-foreground"}
            />
          </p>
        )}
      </CardContent>
    </Card>
  )
}
