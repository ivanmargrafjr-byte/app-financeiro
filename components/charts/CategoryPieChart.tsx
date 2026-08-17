export type CategorySlice = {
  categoryId: string
  name: string
  icon: string
  iconUrl?: string
  color: string
  amountCents: number
}

const RADIUS = 70
const STROKE_WIDTH = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function CategoryPieChart({
  data,
  onSelect,
  emptyLabel = "Sem despesas categorizadas neste mês.",
}: {
  data: CategorySlice[]
  /** When given, each slice becomes a button that opens that category's lançamentos. */
  onSelect?: (slice: CategorySlice) => void
  emptyLabel?: string
}) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        {emptyLabel}
      </div>
    )
  }

  const total = data.reduce((sum, slice) => sum + slice.amountCents, 0)
  const gap = data.length > 1 ? 2 : 0

  const withLength = data.map((slice) => ({
    ...slice,
    length: total > 0 ? (slice.amountCents / total) * CIRCUMFERENCE : 0,
  }))

  const slices = withLength.reduce<
    Array<CategorySlice & { length: number; dashOffset: number; dashArray: string }>
  >((acc, slice) => {
    const previous = acc[acc.length - 1]
    const cumulative = previous ? -previous.dashOffset + previous.length : 0
    const visibleLength = Math.max(slice.length - gap, 0)
    const dashArray = `${visibleLength} ${CIRCUMFERENCE - visibleLength}`
    return [...acc, { ...slice, dashOffset: -cumulative, dashArray }]
  }, [])

  return (
    <div className="flex h-64 items-center justify-center">
      {/* Plain SVG, not Recharts: ResponsiveContainer here only ever laid out
          correctly after a mouse hover forced a recompute — never on mount,
          and never on touch, which made the chart permanently blank on iPad. */}
      <svg width={180} height={180} viewBox="0 0 180 180" className="-rotate-90">
        {slices.map((slice) => (
          <circle
            key={slice.categoryId}
            cx={90}
            cy={90}
            r={RADIUS}
            fill="none"
            stroke={slice.color}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={slice.dashArray}
            strokeDashoffset={slice.dashOffset}
            {...(onSelect && {
              role: "button",
              tabIndex: 0,
              className: "cursor-pointer outline-none hover:opacity-80 focus-visible:opacity-80",
              onClick: () => onSelect(slice),
              // The SVG ring is not a real button, so Enter/Space have to be wired up
              // for it to be reachable without a pointer.
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(slice)
                }
              },
            })}
          >
            {onSelect && <title>{slice.name}</title>}
          </circle>
        ))}
      </svg>
    </div>
  )
}
