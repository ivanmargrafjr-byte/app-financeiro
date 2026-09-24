import { Amount } from "@/components/home/Amount"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { dayMonthParts } from "@/lib/domain/dateUtils"
import { daysWithMovement, type CashFlow } from "@/lib/domain/cashFlow"
import { DEFAULT_CATEGORY_COLOR } from "@/lib/types"

/**
 * The days that have something happening, with the balance each one ends at.
 *
 * Days with no movement are left out: a list of thirty rows where twenty-two say
 * nothing buries the four that matter.
 */
export function CashFlowDays({
  flow,
  days,
  hidden = false,
}: {
  flow: CashFlow
  days: number
  hidden?: boolean
}) {
  const movement = daysWithMovement(flow)

  if (movement.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Nada previsto para os próximos {days} dias.</p>
    )
  }

  return (
    <ul className="grid gap-2">
      {movement.map((day) => {
        const { day: dayNumber, month } = dayMonthParts(day.date)
        return (
          <li
            key={day.date}
            className="border-border bg-card grid gap-2 rounded-lg border px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-baseline gap-1.5 text-sm font-semibold">
                {dayNumber}
                <span className="text-muted-foreground text-[10px] tracking-wide">{month}</span>
              </span>
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                saldo
                <Amount
                  cents={day.balanceCents}
                  hidden={hidden}
                  size="sm"
                  className={day.balanceCents < 0 ? "text-destructive" : undefined}
                />
              </span>
            </div>
            <ul className="grid gap-1">
              {day.items.map((item) => (
                <li key={item.id} className="flex min-w-0 items-center gap-2 text-sm">
                  {item.kind === "simulado" ? (
                    <span className="bg-primary/15 text-primary rounded px-1 text-[10px] font-medium">
                      simulado
                    </span>
                  ) : (
                    <EntityIcon
                      name={item.icon}
                      color={item.color ?? DEFAULT_CATEGORY_COLOR}
                      imageUrl={item.iconUrl}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.description}</span>
                  <Amount
                    cents={item.direction === "in" ? item.amountCents : -item.amountCents}
                    hidden={hidden}
                    size="sm"
                    className={
                      item.direction === "in"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }
                  />
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}
