import { Amount } from "@/components/home/Amount"
import { shortMonthLabel } from "@/lib/domain/dateUtils"
import type { MonthCommitment } from "@/lib/domain/cardCommitment"

/**
 * What the next months already owe to the cards.
 *
 * Bars rather than a chart: the comparison that matters is between the months
 * themselves — which one is heaviest, and whether it is the one where the salary is
 * already spoken for.
 */
export function CommitmentMonths({
  months,
  hidden = false,
}: {
  months: MonthCommitment[]
  hidden?: boolean
}) {
  const max = Math.max(...months.map((m) => m.totalCents), 1)

  return (
    <ul className="grid gap-2">
      {months.map((month) => (
        <li key={month.month} className="grid min-w-0 gap-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground capitalize">{shortMonthLabel(month.month)}</span>
            <Amount
              cents={month.totalCents}
              hidden={hidden}
              size="sm"
              className={month.totalCents === 0 ? "text-muted-foreground" : undefined}
            />
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${(month.totalCents / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
