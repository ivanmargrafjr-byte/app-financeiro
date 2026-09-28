"use client"

import Link from "next/link"
import { AlertTriangle, ChevronRight, Info, X } from "lucide-react"

import { useMonth } from "@/lib/month/MonthProvider"
import { cn } from "@/lib/utils"
import type { Alert } from "@/lib/domain/alerts"

/**
 * Every alert shows what it noticed and why it thinks so, and goes somewhere the
 * user can check it. An alert that cannot be verified is just noise with an icon.
 *
 * "Somewhere" means the row itself: the link carries the month the alert is about and
 * the id of what it saw, so the destination opens on that month with that row ringed
 * instead of on whatever month was last being browsed.
 */
export function AlertList({
  alerts,
  emptyLabel,
  onDismiss,
}: {
  alerts: Alert[]
  emptyLabel: string
  /** Offered only where dismissing makes sense — see the duplicates alert. */
  onDismiss?: (alert: Alert) => void
}) {
  const { setMonth } = useMonth()

  if (alerts.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>
  }

  return (
    <ul className="grid gap-2">
      {alerts.map((alert) => {
        const critical = alert.severity === "critico"
        return (
          <li key={alert.id} className="relative">
            {onDismiss && alert.kind === "duplicidade" && (
              <button
                type="button"
                aria-label="Ignorar este aviso"
                onClick={() => onDismiss(alert)}
                className="text-muted-foreground hover:text-foreground absolute top-2 right-9 z-10 p-1"
              >
                <X className="size-3.5" />
              </button>
            )}
            <Link
              href={alert.href}
              onClick={() => {
                if (alert.month) setMonth(alert.month)
              }}
              className="border-border bg-card hover:bg-accent flex items-start justify-between gap-2 rounded-lg border px-3 py-2.5"
            >
              <span className="flex min-w-0 items-start gap-2">
                {critical ? (
                  <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
                ) : (
                  <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                )}
                <span className="min-w-0">
                  <span
                    className={cn("block text-sm font-medium", critical && "text-destructive")}
                  >
                    {alert.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">{alert.because}</span>
                </span>
              </span>
              <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
