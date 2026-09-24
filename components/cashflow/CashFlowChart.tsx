import { formatDateBR } from "@/lib/domain/dateUtils"
import { formatCentsBRL } from "@/lib/domain/money"
import type { CashFlow } from "@/lib/domain/cashFlow"

const W = 320
const H = 110
const PAD = 6

/**
 * The projected balance as a line, drawn inline rather than through a chart library.
 *
 * What has to read here is one thing — where the line crosses zero — so the chart is
 * a path, a dashed zero line and a marker on the lowest point. A library would bring
 * a bundle and a hundred options for a picture with three elements, on an app that
 * has to stay light inside a WebView.
 */
export function CashFlowChart({ flow, hidden }: { flow: CashFlow; hidden: boolean }) {
  const values = flow.days.map((d) => d.balanceCents)
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const span = max - min || 1

  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(flow.days.length - 1, 1)
  const y = (cents: number) => PAD + ((max - cents) * (H - PAD * 2)) / span

  const line = flow.days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.balanceCents).toFixed(1)}`).join(" ")
  const area = `${line} L${x(flow.days.length - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`
  const lowestIndex = flow.days.findIndex((d) => d.date === flow.lowest.date)
  const negativeIndex = flow.firstNegative
    ? flow.days.findIndex((d) => d.date === flow.firstNegative!.date)
    : -1

  return (
    <figure className="grid gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
        role="img"
        aria-label={`Saldo projetado até ${formatDateBR(flow.days[flow.days.length - 1].date)}`}
      >
        <path d={area} className="fill-primary/10" />
        <line
          x1={PAD}
          x2={W - PAD}
          y1={y(0)}
          y2={y(0)}
          className="stroke-muted-foreground/40"
          strokeDasharray="4 4"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Only the day it breaks is painted as trouble: a line that is red end to end
            warns about the whole month, when the problem is one afternoon. */}
        {negativeIndex >= 0 && (
          <line
            x1={x(negativeIndex)}
            x2={x(negativeIndex)}
            y1={PAD}
            y2={H - PAD}
            className="stroke-destructive/50"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {lowestIndex >= 0 && (
          <circle
            cx={x(lowestIndex)}
            cy={y(flow.lowest.cents)}
            r={3}
            className={flow.lowest.cents < 0 ? "fill-destructive" : "fill-primary"}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <figcaption className="text-muted-foreground flex justify-between text-xs">
        <span>hoje · {hidden ? "•••" : formatCentsBRL(flow.startBalanceCents)}</span>
        <span>
          {formatDateBR(flow.days[flow.days.length - 1].date)} ·{" "}
          {hidden ? "•••" : formatCentsBRL(flow.endBalanceCents)}
        </span>
      </figcaption>
    </figure>
  )
}
