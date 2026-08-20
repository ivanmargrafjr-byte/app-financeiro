import Link from "next/link"
import { ChevronRight, Sparkles } from "lucide-react"

/**
 * A standing reminder of how much of the free trial is left, with the way to
 * subscribe one tap away. Deliberately not dismissible: the whole point of a
 * card-less trial is that the person decides on day 7 with full information, and
 * a countdown they cannot see is a bill that arrives as a surprise instead.
 */
export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <Link
      href="/assinatura"
      className="flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
    >
      <Sparkles className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Teste grátis ·{" "}
          {daysLeft <= 0
            ? "termina hoje"
            : daysLeft === 1
              ? "último dia"
              : `faltam ${daysLeft} dias`}
        </p>
        <p className="text-muted-foreground text-xs">
          Assine para continuar com tudo depois desse período
        </p>
      </div>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  )
}
