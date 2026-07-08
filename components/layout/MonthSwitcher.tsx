"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { monthLabel } from "@/lib/domain/dateUtils"
import { useMonth } from "@/lib/month/MonthProvider"

export function MonthSwitcher() {
  const { month, nextMonth, prevMonth, goToCurrentMonth } = useMonth()

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mês anterior">
        <ChevronLeft className="size-4" />
      </Button>
      <button
        onClick={goToCurrentMonth}
        className="min-w-40 text-center text-sm font-medium capitalize hover:underline"
      >
        {monthLabel(month)}
      </button>
      <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Próximo mês">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
