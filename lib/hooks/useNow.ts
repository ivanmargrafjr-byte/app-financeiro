"use client"

import { useSyncExternalStore } from "react"

/**
 * The current time, as a value a component may read during render.
 *
 * Calling `Date.now()` in a render body is impure — the same render would produce
 * different output on every pass — so the clock is modelled as what it actually is:
 * an external source the component subscribes to. The subscription also fixes a real
 * problem, not just a lint complaint: a free trial that runs out while the tab is
 * sitting open now takes effect on the next tick instead of waiting for a reload.
 */

const TICK_MS = 60_000

const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null
// Cached because useSyncExternalStore requires a snapshot that only changes when it
// notifies — returning a fresh Date.now() per call would loop forever.
let current = 0

function tick() {
  current = Date.now()
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!timer) {
    current = Date.now()
    timer = setInterval(tick, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

function getSnapshot(): number {
  return current
}

/** Epoch zero while prerendering: these screens render their loading state there. */
function getServerSnapshot(): number {
  return 0
}

/** Milliseconds since the epoch, refreshed about once a minute. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
