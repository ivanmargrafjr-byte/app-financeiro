/**
 * A card that was replaced gets archived, but its history has to stay: the months
 * before the replacement exist *only* on the old card. So archiving alone can't
 * drop a card from the totals — that would rewrite the past.
 *
 * `archivedFromMonth` is the month the replacement took over. From that month on the
 * old card's entries are a stale copy of what the new card already carries (typically
 * the tail of its installments), so they stop counting. Before it, they are the only
 * record of that spending and keep counting as usual.
 */

import { compareMonth, type MonthString } from "@/lib/domain/dateUtils"
import type { Card } from "@/lib/types"

export type CardCutoff = Pick<Card, "archived" | "archivedFromMonth">

/** Whether a card's entries for `competenceMonth` still belong in monthly totals. */
export function cardCountsInMonth(
  card: CardCutoff | undefined,
  competenceMonth: MonthString
): boolean {
  // An unknown card counts, rather than silently dropping entries we can't explain.
  // An archived card with no cutoff set counts too, so introducing the field never
  // changes totals that were already right.
  if (!card?.archived || !card.archivedFromMonth) return true
  return compareMonth(competenceMonth, card.archivedFromMonth) < 0
}
