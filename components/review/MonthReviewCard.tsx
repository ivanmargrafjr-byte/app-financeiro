import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Amount } from "@/components/home/Amount"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { monthLabel } from "@/lib/domain/dateUtils"
import { explainDespesas, type MonthReview } from "@/lib/domain/monthReview"
import { cn } from "@/lib/utils"

function Delta({ cents, invert = false }: { cents: number; invert?: boolean }) {
  if (cents === 0) return <span className="text-muted-foreground text-xs">sem variação</span>
  // For expenses, up is bad; for income and balance, up is good.
  const good = invert ? cents < 0 : cents > 0
  const Icon = cents > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs",
        good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
      )}
    >
      <Icon className="size-3.5" />
      <Amount cents={Math.abs(cents)} size="sm" />
    </span>
  )
}

/**
 * What changed since last month, and which entries are responsible.
 *
 * The sentence at the top is a claim the rest of the card has to support: if it says
 * the recurring charges held steady, the split underneath must show that too.
 */
export function MonthReviewCard({ review, hidden = false }: { review: MonthReview; hidden?: boolean }) {
  const top = review.byCategory.slice(0, 4)

  return (
    <div className="grid gap-3">
      <p className="text-sm">{explainDespesas(review)}</p>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Receitas", movement: review.receitas, invert: false },
          { label: "Despesas", movement: review.despesas, invert: true },
          { label: "Sobrou", movement: review.saldo, invert: false },
        ].map(({ label, movement, invert }) => (
          <div key={label} className="bg-muted grid gap-0.5 rounded-lg p-2.5">
            <span className="text-muted-foreground text-xs">{label}</span>
            <Amount cents={movement.currentCents} hidden={hidden} size="sm" />
            <Delta cents={movement.deltaCents} invert={invert} />
          </div>
        ))}
      </div>

      <div className="grid gap-1 text-xs">
        <p className="text-muted-foreground">
          Do que mudou nas despesas,{" "}
          <Amount cents={Math.abs(review.recurring.deltaCents)} hidden={hidden} size="sm" /> vem do
          que se repete todo mês e{" "}
          <Amount cents={Math.abs(review.oneOff.deltaCents)} hidden={hidden} size="sm" /> do que não
          se repete.
        </p>
      </div>

      {top.length > 0 && (
        <ul className="grid gap-1.5">
          {top.map((category) => (
            <li key={category.categoryId} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm">
                <EntityIcon name={category.icon} color={category.color} imageUrl={category.iconUrl} />
                <span className="truncate">{category.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  <Amount cents={category.previousCents} hidden={hidden} size="sm" /> →{" "}
                  <Amount cents={category.currentCents} hidden={hidden} size="sm" />
                </span>
                <Delta cents={category.deltaCents} invert />
              </span>
            </li>
          ))}
        </ul>
      )}

      {review.exceptional.length > 0 && (
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs">
            Gastos que não se repetem, e por isso não devem ser lidos como o novo normal:
          </p>
          <ul className="grid gap-1">
            {review.exceptional.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{t.description}</span>
                <Amount cents={t.amountCents} hidden={hidden} size="sm" className="shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Comparando {monthLabel(review.month).toLowerCase()} com{" "}
        {monthLabel(review.previousMonth).toLowerCase()}.
      </p>
    </div>
  )
}
