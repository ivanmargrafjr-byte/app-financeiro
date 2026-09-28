/**
 * Pointing at one thing.
 *
 * An alert that says "Mercado passou do limite" and then drops the person on a screen
 * with eleven other categories has made them do the search a second time. The alert
 * already knows which row it means, so it carries that id in the link and the screen
 * marks it on arrival.
 *
 * The ids are repeated as separate query values rather than joined by a separator, so
 * nothing has to be escaped and no id can ever be split in half.
 */

export const FOCUS_PARAM = "foco"

/** Set on the row an alert pointed at — see `.destacado` in globals.css. */
export const FOCUS_CLASS = "destacado"

/**
 * A link to `path` that also says which rows to look at.
 *
 * With no ids it returns the path untouched: a link with an empty `foco` would make
 * the destination scroll to nothing.
 */
export function withFocus(path: string, ids: string[]): string {
  const wanted = ids.filter((id) => id.length > 0)
  if (wanted.length === 0) return path
  const params = new URLSearchParams()
  for (const id of wanted) params.append(FOCUS_PARAM, id)
  return `${path}${path.includes("?") ? "&" : "?"}${params}`
}

/**
 * The DOM id a focusable row carries.
 *
 * Prefixed because these ids come from Firestore and from dates, and a bare "2026-10-03"
 * as an element id is a collision waiting for the next thing that uses dates.
 */
export function focusAnchorId(id: string): string {
  return `foco-${id}`
}
