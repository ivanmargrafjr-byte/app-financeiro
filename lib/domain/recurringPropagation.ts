/**
 * Each month of a recurring rule is materialized as its own transaction doc, and
 * generation never revisits one (it must not clobber a lançamento the user edited by
 * hand). So editing the rule has to carry the change into those docs explicitly —
 * otherwise the rule says one thing and every month already on screen says another.
 *
 * What it must not touch is what already happened: a settled occurrence has moved the
 * account balance and been reconciled, and past months are a record, not a forecast.
 */

import { compareMonth, type MonthString } from "@/lib/domain/dateUtils"

export type OccurrenceState = {
  competenceMonth: MonthString
  settled: boolean
}

/**
 * Whether an edit to the rule should rewrite this occurrence. `currentMonth` is the
 * real calendar month, not the month being browsed — editing a rule while looking at
 * December shouldn't decide the fate of October.
 */
export function shouldPropagateToOccurrence(
  occurrence: OccurrenceState,
  currentMonth: MonthString
): boolean {
  if (occurrence.settled) return false
  return compareMonth(occurrence.competenceMonth, currentMonth) >= 0
}
