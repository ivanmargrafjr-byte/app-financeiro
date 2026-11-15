import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * What a list shows when there is nothing in it yet.
 *
 * Loose muted text under the page title reads as a loading glitch; a quiet dashed
 * frame with a title and one line of next step reads as a place that is waiting.
 */
function EmptyState({
  title,
  children,
  className,
}: {
  title: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "border-border grid gap-1 rounded-xl border border-dashed px-5 py-8 text-center",
        className
      )}
    >
      <p className="text-foreground text-sm font-medium">{title}</p>
      {children && (
        <p className="text-muted-foreground mx-auto max-w-prose text-sm text-pretty">
          {children}
        </p>
      )}
    </div>
  )
}

export { EmptyState }
