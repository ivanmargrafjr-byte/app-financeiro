/**
 * Money set aside for something that has not happened yet: a goal being saved for,
 * or a bill that is known and annual.
 *
 * The two are the same arithmetic — an amount, a date, and what is already put
 * away — and differ only in what they mean to the person. They are kept in one
 * model so the monthly effort is computed the same way for both, and shown apart
 * so "juntar para a viagem" never reads like "o seguro vence".
 */

import { addMonths, compareMonth, monthOfDate, type DateString, type MonthString } from "@/lib/domain/dateUtils"

export type GoalKind = "meta" | "anual"

export type Goal = {
  id: string
  kind: GoalKind
  name: string
  targetCents: number
  /** When the money has to be there. */
  dueDate: DateString
  /** What is already put away for it. */
  savedCents: number
  icon: string
  color: string
  createdAt: number
}

export type GoalProgress = {
  goal: Goal
  /** What is still missing; 0 once the target is reached. */
  missingCents: number
  /** 0–1, capped so an over-saved goal does not overflow its track. */
  progressRatio: number
  /** Months left to put the rest away, counting the month it is due. Never below 1. */
  monthsLeft: number
  /** What has to be set aside each month from now to get there in time. */
  monthlyCents: number
  reached: boolean
  /** Past its date with money still missing. */
  late: boolean
}

function monthsBetween(from: MonthString, to: MonthString): number {
  if (compareMonth(to, from) <= 0) return 0
  let count = 0
  let cursor = from
  while (compareMonth(cursor, to) < 0) {
    cursor = addMonths(cursor, 1)
    count++
  }
  return count
}

export function goalProgress(goal: Goal, today: DateString): GoalProgress {
  const missingCents = Math.max(0, goal.targetCents - goal.savedCents)
  const reached = missingCents === 0
  const dueMonth = monthOfDate(goal.dueDate)
  // The month it is due counts as one more chance to put money away, so a bill due
  // in three months is divided by three rather than by two.
  const monthsLeft = Math.max(1, monthsBetween(monthOfDate(today), dueMonth) + 1)

  return {
    goal,
    missingCents,
    progressRatio: goal.targetCents > 0 ? Math.min(1, goal.savedCents / goal.targetCents) : 0,
    monthsLeft,
    monthlyCents: reached ? 0 : Math.ceil(missingCents / monthsLeft),
    reached,
    late: !reached && goal.dueDate < today,
  }
}

/** Everything already put away — the part of the balance that is spoken for. */
export function sumSaved(goals: Goal[]): number {
  return goals.reduce((total, goal) => total + goal.savedCents, 0)
}

/** What all the goals together ask of a month. */
export function sumMonthly(goals: Goal[], today: DateString): number {
  return goals.reduce((total, goal) => total + goalProgress(goal, today).monthlyCents, 0)
}
