/**
 * Category budgets: what was meant to be spent, what has been spent, and whether
 * the month is running ahead of itself.
 *
 * The figure that changes behaviour is not the total spent but the pace: R$ 600 of
 * an R$ 800 limit is fine on the 28th and a problem on the 9th. So every line
 * carries how far into the period the spending is, not only how much of it.
 */

import { countsInMonthlyTotals } from "@/lib/domain/monthlyTotals"
import { daysInMonth, parseMonth, type DateString, type MonthString } from "@/lib/domain/dateUtils"
import type { Card, Category, Transaction } from "@/lib/types"

export type Budget = {
  /** The category the limit belongs to; also the document id. */
  categoryId: string
  limitCents: number
}

export type BudgetStatus = "ok" | "atencao" | "estourado"

export type BudgetLine = {
  category: Category
  limitCents: number
  spentCents: number
  /** Negative once the limit is passed. */
  remainingCents: number
  /** 0–1, capped so an overrun does not overflow its track. */
  usedRatio: number
  status: BudgetStatus
}

/**
 * How much of the period has already gone by: 0 before it starts, 1 once it is over.
 * A month being watched from inside sits somewhere between.
 */
export function elapsedRatio(month: MonthString, today: DateString): number {
  const todayMonth = today.slice(0, 7)
  if (month < todayMonth) return 1
  if (month > todayMonth) return 0
  const { year, month: m } = parseMonth(month)
  return Number(today.slice(8, 10)) / daysInMonth(year, m)
}

function statusFor(spentCents: number, limitCents: number, elapsed: number): BudgetStatus {
  if (limitCents <= 0) return "ok"
  if (spentCents > limitCents) return "estourado"
  // A tenth of the limit of slack: without it every purchase made before its
  // proportional share of the month would be flagged, and a warning that fires all
  // the time stops being read.
  if (spentCents / limitCents > elapsed + 0.1) return "atencao"
  return "ok"
}

/**
 * Spending per category for a month, following the same rule as the monthly totals —
 * transfers, adjustments, invoice payments and card-settled markers stay out, so a
 * budget can never be consumed by money that only moved between the user's own
 * pockets.
 *
 * A parent category's budget also counts what its children spent: someone who limits
 * "Casa" means the whole house, not the leftovers that were never filed deeper.
 */
export function buildBudgetLines(input: {
  budgets: Budget[]
  categories: Category[]
  transactions: Transaction[]
  archivedCardsById: Map<string, Card>
  month: MonthString
  today: DateString
}): BudgetLine[] {
  const spentByCategory = new Map<string, number>()
  for (const t of input.transactions) {
    if (t.direction !== "out") continue
    if (!countsInMonthlyTotals(t, input.archivedCardsById)) continue
    spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + t.amountCents)
  }

  const childrenOf = new Map<string, string[]>()
  for (const category of input.categories) {
    if (!category.parentId) continue
    const list = childrenOf.get(category.parentId)
    if (list) list.push(category.id)
    else childrenOf.set(category.parentId, [category.id])
  }

  const categoriesById = new Map(input.categories.map((c) => [c.id, c]))
  const elapsed = elapsedRatio(input.month, input.today)

  return input.budgets
    .flatMap((budget) => {
      const category = categoriesById.get(budget.categoryId)
      if (!category) return []
      const own = spentByCategory.get(category.id) ?? 0
      const fromChildren = (childrenOf.get(category.id) ?? []).reduce(
        (total, childId) => total + (spentByCategory.get(childId) ?? 0),
        0
      )
      const spentCents = own + fromChildren
      return [
        {
          category,
          limitCents: budget.limitCents,
          spentCents,
          remainingCents: budget.limitCents - spentCents,
          usedRatio: budget.limitCents > 0 ? Math.min(1, spentCents / budget.limitCents) : 0,
          status: statusFor(spentCents, budget.limitCents, elapsed),
        },
      ]
    })
    .sort((a, b) => b.spentCents / (b.limitCents || 1) - a.spentCents / (a.limitCents || 1))
}

export type BudgetTotals = { limitCents: number; spentCents: number; remainingCents: number }

export function sumBudgets(lines: BudgetLine[]): BudgetTotals {
  const limitCents = lines.reduce((total, line) => total + line.limitCents, 0)
  const spentCents = lines.reduce((total, line) => total + line.spentCents, 0)
  return { limitCents, spentCents, remainingCents: limitCents - spentCents }
}
