import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Amount } from "@/components/home/Amount"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { cn } from "@/lib/utils"
import { dayMonthParts } from "@/lib/domain/dateUtils"
import type { UpcomingItem } from "@/lib/domain/homeSummary"

/**
 * What the app already knows is coming: pending lançamentos and invoices about to
 * fall due. The subtitle says "já conhecidos" on purpose — nothing here is a
 * forecast from spending habits, only what the user (or a card) already recorded.
 */
export function UpcomingCard({
  items,
  days,
  hidden,
}: {
  items: UpcomingItem[]
  days: number
  hidden: boolean
}) {
  return (
    <Card>
      <CardContent className="grid gap-3">
        <div className="grid gap-0.5">
          <Link
            href="/transacoes"
            className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline"
          >
            Próximos {days} dias
            <ChevronRight className="size-3.5" />
          </Link>
          <p className="text-muted-foreground/70 text-xs">compromissos já conhecidos</p>
        </div>

        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nada previsto para os próximos {days} dias.
          </p>
        ) : (
          // min-w-0 all the way down: a grid or flex item defaults to min-width:auto,
          // which makes it as wide as its content. Without it the row stretches past
          // the card and carries the amount out of sight with it, and the truncation
          // below never gets a chance to happen, because nothing is ever constrained.
          <ul className="grid min-w-0 gap-1">
            {items.map((item) => {
              const { day, month } = dayMonthParts(item.date)
              return (
                <li key={`${item.kind}-${item.id}`} className="flex min-w-0 items-center gap-2 py-1.5 sm:gap-3">
                  <div className="text-muted-foreground w-9 shrink-0 text-center leading-none">
                    <div className="text-foreground text-sm font-semibold">{day}</div>
                    <div className="text-[10px] tracking-wide">{month}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* The truncate has to sit on the text itself: on the flex row it
                        does nothing, and the description then pushes the amount clean
                        off the card on a narrow screen. */}
                    <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                      <EntityIcon name={item.icon} color={item.color} imageUrl={item.iconUrl} />
                      <span className="min-w-0 truncate">{item.description}</span>
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {item.kind === "fatura" ? "fatura do cartão" : "lançamento pendente"}
                    </p>
                  </div>
                  <Amount
                    cents={item.amountCents}
                    hidden={hidden}
                    size="sm"
                    className={cn(
                      "shrink-0",
                      item.direction === "in"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    )}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
