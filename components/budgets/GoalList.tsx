import { Amount } from "@/components/home/Amount"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { formatDateBR } from "@/lib/domain/dateUtils"
import { goalProgress, type Goal } from "@/lib/domain/goals"
import { cn } from "@/lib/utils"

/**
 * Goals and annual bills, each with the monthly effort that gets there in time.
 *
 * The monthly figure is the useful one: "R$ 1.200 em seis meses" is a wish, "R$ 200
 * por mês" is a decision someone can compare against the rest of their month.
 */
export function GoalList({
  goals,
  today,
  hidden = false,
  emptyLabel,
  action,
}: {
  goals: Goal[]
  today: string
  hidden?: boolean
  emptyLabel: string
  action?: (goal: Goal) => React.ReactNode
}) {
  if (goals.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>
  }

  return (
    <ul className="grid gap-2">
      {goals.map((goal) => {
        const progress = goalProgress(goal, today)
        return (
          <li
            key={goal.id}
            className="border-border bg-card grid gap-1.5 rounded-lg border px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                <EntityIcon name={goal.icon} color={goal.color} />
                <span className="truncate">{goal.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-muted-foreground text-xs">
                  <Amount cents={goal.savedCents} hidden={hidden} size="sm" /> de{" "}
                  <Amount cents={goal.targetCents} hidden={hidden} size="sm" />
                </span>
                {action?.(goal)}
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full",
                  progress.reached ? "bg-emerald-600" : progress.late ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${progress.progressRatio * 100}%` }}
              />
            </div>
            <p
              className={cn(
                "text-xs",
                progress.late ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {progress.reached ? (
                <>Completo · para {formatDateBR(goal.dueDate)}</>
              ) : progress.late ? (
                <>
                  Venceu em {formatDateBR(goal.dueDate)} · faltam{" "}
                  <Amount cents={progress.missingCents} hidden={hidden} size="sm" />
                </>
              ) : (
                <>
                  <Amount cents={progress.monthlyCents} hidden={hidden} size="sm" /> por mês até{" "}
                  {formatDateBR(goal.dueDate)}
                </>
              )}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
