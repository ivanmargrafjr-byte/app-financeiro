import { Amount } from "@/components/home/Amount"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { FOCUS_CLASS, focusAnchorId } from "@/lib/navigation/focus"
import { cn } from "@/lib/utils"
import type { BudgetLine } from "@/lib/domain/budget"

const STATUS_STYLE = {
  ok: { bar: "bg-primary", label: "" },
  atencao: { bar: "bg-amber-500", label: "acima do ritmo do mês" },
  estourado: { bar: "bg-destructive", label: "limite estourado" },
} as const

/**
 * A limit, what has gone against it, and whether the month is being spent faster
 * than it is passing.
 *
 * The pace is the part worth showing: the same R$ 600 of an R$ 800 limit is calm on
 * the 28th and a problem on the 9th, and only the second one is worth a colour.
 */
export function BudgetLines({
  lines,
  hidden = false,
  focusedIds,
  action,
}: {
  lines: BudgetLine[]
  hidden?: boolean
  /** Categories an alert is pointing at — ringed on arrival. */
  focusedIds?: ReadonlySet<string>
  /** Rendered at the end of each row — the edit control lives outside this file. */
  action?: (line: BudgetLine) => React.ReactNode
}) {
  if (lines.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhum limite definido ainda. Escolha uma categoria e diga quanto pretende gastar
        nela por mês.
      </p>
    )
  }

  return (
    <ul className="grid gap-2">
      {lines.map((line) => {
        const style = STATUS_STYLE[line.status]
        return (
          <li
            key={line.category.id}
            id={focusAnchorId(line.category.id)}
            className={cn(
              "border-border bg-card grid gap-1.5 rounded-lg border px-3 py-2.5",
              focusedIds?.has(line.category.id) && FOCUS_CLASS
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                <EntityIcon
                  name={line.category.icon}
                  color={line.category.color}
                  imageUrl={line.category.iconUrl}
                />
                <span className="truncate">{line.category.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-muted-foreground text-xs">
                  <Amount cents={line.spentCents} hidden={hidden} size="sm" /> de{" "}
                  <Amount cents={line.limitCents} hidden={hidden} size="sm" />
                </span>
                {action?.(line)}
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className={cn("h-full rounded-full", style.bar)}
                style={{ width: `${line.usedRatio * 100}%` }}
              />
            </div>
            <p
              className={cn(
                "text-xs",
                line.status === "estourado"
                  ? "text-destructive"
                  : line.status === "atencao"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              )}
            >
              {line.remainingCents >= 0 ? (
                <>
                  <Amount cents={line.remainingCents} hidden={hidden} size="sm" /> disponíveis
                  {style.label && ` · ${style.label}`}
                </>
              ) : (
                <>
                  <Amount cents={Math.abs(line.remainingCents)} hidden={hidden} size="sm" /> acima
                  do limite
                </>
              )}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
