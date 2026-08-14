/**
 * Each month of a recurring rule is materialized as its own transaction doc, and
 * generation never revisits one (it must not clobber a lançamento the user edited by
 * hand). So changing the rule has to reach into those docs explicitly — otherwise the
 * rule says one thing and every month already on screen says another.
 *
 * What it must not touch is what already happened: a settled occurrence has moved the
 * account balance and been reconciled, and past months are a record, not a forecast.
 */

import { compareMonth, type MonthString } from "@/lib/domain/dateUtils"

export type OccurrenceState = {
  competenceMonth: MonthString
  settled: boolean
}

/** The bounds are optional so switching a rule off needs only `{ active: false }`. */
export type RuleRange = {
  active: boolean
  startMonth?: MonthString
  endMonth?: MonthString | null
}

/**
 * `update` — rewrite it with the rule's new values.
 * `delete` — the rule no longer covers that month (switched off, or the start/end
 *            moved past it), so the lançamento shouldn't exist at all.
 * `keep`   — settled or already in the past: leave it exactly as it is.
 */
export type OccurrenceDisposition = "update" | "delete" | "keep"

/**
 * `currentMonth` is the real calendar month, not the month being browsed — changing a
 * rule while looking at December must not decide the fate of October.
 */
export function dispositionForOccurrence(
  occurrence: OccurrenceState,
  rule: RuleRange,
  currentMonth: MonthString
): OccurrenceDisposition {
  if (occurrence.settled) return "keep"
  if (compareMonth(occurrence.competenceMonth, currentMonth) < 0) return "keep"

  const withinRange =
    rule.active &&
    (!rule.startMonth || compareMonth(occurrence.competenceMonth, rule.startMonth) >= 0) &&
    (!rule.endMonth || compareMonth(occurrence.competenceMonth, rule.endMonth) <= 0)

  return withinRange ? "update" : "delete"
}
