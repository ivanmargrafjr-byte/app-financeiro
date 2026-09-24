import { Amount } from "@/components/home/Amount"
import { formatDateBR } from "@/lib/domain/dateUtils"
import { contractEvents, describeIncrease } from "@/lib/domain/contractLifecycle"
import { cn } from "@/lib/utils"
import type { Contract } from "@/lib/types"

/**
 * Every date this contract carries, in order.
 *
 * Dates already past are kept and dimmed rather than removed: a cancellation window
 * that closed last month is the explanation for the bill that keeps arriving.
 */
export function ContractTimeline({ contract, today }: { contract: Contract; today: string }) {
  const events = contractEvents(contract, today)

  return (
    <ol className="grid gap-2">
      {events.map((event) => {
        const increase = describeIncrease(event)
        return (
          <li
            key={`${event.kind}-${event.date}`}
            className={cn(
              "border-border grid gap-0.5 border-l-2 py-0.5 pl-3",
              event.past ? "border-muted" : "border-primary"
            )}
          >
            <span className={cn("text-sm", event.past && "text-muted-foreground")}>
              {event.label}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatDateBR(event.date)}
              {event.past && " · já passou"}
              {event.deltaCents != null && event.deltaCents !== 0 && increase && (
                <>
                  {" · "}
                  <Amount cents={Math.abs(event.deltaCents)} size="sm" /> {increase}
                </>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
