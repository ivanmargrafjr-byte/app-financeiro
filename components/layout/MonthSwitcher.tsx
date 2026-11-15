"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { monthLabel } from "@/lib/domain/dateUtils"
import { useMonth } from "@/lib/month/MonthProvider"

export function MonthSwitcher() {
  const { month, nextMonth, prevMonth, goToCurrentMonth } = useMonth()

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Mês exibido">
      <Button
        variant="outline"
        size="icon"
        className="size-11"
        onClick={prevMonth}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <button
        type="button"
        onClick={goToCurrentMonth}
        className="focus-visible:ring-ring min-w-40 rounded-md py-3 text-center text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        {monthLabel(month)}
        <span className="sr-only"> — voltar ao mês atual</span>
      </button>
      {/* Anuncia a troca de mês: o rótulo do botão acima não é uma região viva. */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {monthLabel(month)}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="size-11"
        onClick={nextMonth}
        aria-label="Próximo mês"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
