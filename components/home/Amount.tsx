import { formatCentsBRL } from "@/lib/domain/money"
import { cn } from "@/lib/utils"

/**
 * Sizes step up with the viewport rather than being fixed: a Galaxy Fold's cover
 * screen is around 300px wide, where a figure set at text-xl runs past the box it
 * sits in.
 */
const SIZES = {
  sm: { value: "text-sm font-medium", cents: "text-xs" },
  md: { value: "text-base font-semibold min-[420px]:text-lg sm:text-xl", cents: "text-xs sm:text-sm" },
  lg: { value: "text-xl font-semibold min-[380px]:text-2xl", cents: "text-sm min-[380px]:text-base" },
  xl: {
    value: "text-2xl font-bold tracking-tight min-[380px]:text-3xl sm:text-4xl",
    cents: "text-base min-[380px]:text-lg sm:text-xl",
  },
} as const

export type AmountSize = keyof typeof SIZES

/**
 * A money figure with the cents set smaller than the reais.
 *
 * The point is reading speed: on a screen whose job is to answer "how much do I
 * have" at a glance, the cents are noise competing with the digits that matter.
 * Shrinking them keeps the value exact while letting the eye land on the reais.
 */
export function Amount({
  cents,
  hidden = false,
  size = "md",
  /** Prefix with '~' for a figure that still moves — an open invoice, a projection. */
  approximate = false,
  className,
}: {
  cents: number
  hidden?: boolean
  size?: AmountSize
  approximate?: boolean
  className?: string
}) {
  const styles = SIZES[size]

  if (hidden) {
    return (
      <span className={cn(styles.value, "tabular-nums", className)} aria-label="valor oculto">
        R$ ••••
      </span>
    )
  }

  const formatted = formatCentsBRL(cents)
  const commaAt = formatted.lastIndexOf(",")
  const reais = commaAt === -1 ? formatted : formatted.slice(0, commaAt)
  const centavos = commaAt === -1 ? "" : formatted.slice(commaAt)

  return (
    <span className={cn(styles.value, "tabular-nums", className)}>
      {approximate && <span className="text-muted-foreground">~</span>}
      {reais}
      {centavos && <span className={cn(styles.cents, "font-normal")}>{centavos}</span>}
    </span>
  )
}
