/**
 * Whether money figures are masked on screen — for opening the app somewhere public.
 *
 * Kept as a little external store rather than component state so React can read it
 * with `useSyncExternalStore`: localStorage doesn't exist while the page is being
 * prerendered, and seeding state from it in an effect causes a cascading render on
 * every mount. As a bonus, the subscription picks up the `storage` event, so
 * toggling in one tab masks the others too.
 */

const KEY = "financas:ocultar-valores"

const listeners = new Set<() => void>()

export function subscribeHiddenValues(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

export function getHiddenValues(): boolean {
  return window.localStorage.getItem(KEY) === "true"
}

/** Nothing is masked in a prerender — there is no stored preference to read there. */
export function getHiddenValuesOnServer(): boolean {
  return false
}

export function toggleHiddenValues(): void {
  window.localStorage.setItem(KEY, String(!getHiddenValues()))
  // The storage event doesn't fire in the tab that wrote it, so notify by hand.
  for (const listener of listeners) listener()
}
