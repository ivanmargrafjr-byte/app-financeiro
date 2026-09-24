import Link from "next/link"
import { AlertTriangle, CalendarClock, ChevronRight } from "lucide-react"

import { Amount } from "@/components/home/Amount"
import { formatDateBR } from "@/lib/domain/dateUtils"
import { describeIncrease, type ContractAttention } from "@/lib/domain/contractLifecycle"
import { cn } from "@/lib/utils"

function whenLabel(inDays: number): string {
  if (inDays === 0) return "hoje"
  if (inDays === 1) return "amanhã"
  if (inDays <= 30) return `em ${inDays} dias`
  const months = Math.round(inDays / 30)
  return months === 1 ? "em 1 mês" : `em ${months} meses`
}

/**
 * The contracts with a date coming up, soonest first.
 *
 * Ordered by how soon rather than by supplier: what has to be decided this week is
 * the whole reason to open this list, and sorting by name buries it.
 */
export function ContractAgenda({ attention }: { attention: ContractAttention[] }) {
  if (attention.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum contrato pede atenção nos próximos 90 dias.
      </p>
    )
  }

  return (
    <ul className="grid gap-2">
      {attention.map(({ contract, event, inDays }) => {
        const urgent = inDays <= 15
        const increase = describeIncrease(event)
        return (
          <li key={`${contract.id}-${event.kind}`}>
            <Link
              href={`/contratos/${contract.id}`}
              className="border-border bg-card hover:bg-accent flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2">
                {urgent ? (
                  <AlertTriangle className="text-destructive size-4 shrink-0" />
                ) : (
                  <CalendarClock className="text-muted-foreground size-4 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {contract.contractee} · {event.label}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-xs",
                      urgent ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {formatDateBR(event.date)} · {whenLabel(inDays)}
                    {event.deltaCents != null && event.deltaCents !== 0 && increase && (
                      <>
                        {" · "}
                        <Amount cents={Math.abs(event.deltaCents)} size="sm" /> {increase}
                      </>
                    )}
                  </span>
                </span>
              </span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
