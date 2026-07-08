"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { addMonths, currentMonthString, type MonthString } from "@/lib/domain/dateUtils"

type MonthContextValue = {
  month: MonthString
  setMonth: (month: MonthString) => void
  nextMonth: () => void
  prevMonth: () => void
  goToCurrentMonth: () => void
}

const MonthContext = createContext<MonthContextValue | null>(null)

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<MonthString>(() => currentMonthString())

  const value = useMemo<MonthContextValue>(
    () => ({
      month,
      setMonth,
      nextMonth: () => setMonth((m) => addMonths(m, 1)),
      prevMonth: () => setMonth((m) => addMonths(m, -1)),
      goToCurrentMonth: () => setMonth(currentMonthString()),
    }),
    [month]
  )

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>
}

export function useMonth() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error("useMonth must be used within a MonthProvider")
  return ctx
}
