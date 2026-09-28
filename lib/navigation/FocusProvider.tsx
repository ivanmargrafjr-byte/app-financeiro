"use client"

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

import { FOCUS_PARAM, focusAnchorId } from "@/lib/navigation/focus"

const EMPTY: ReadonlySet<string> = new Set()

const FocusContext = createContext<ReadonlySet<string>>(EMPTY)

/**
 * Holds the rows the current link is pointing at.
 *
 * It reads the query once, here, instead of in each screen: `useSearchParams` needs a
 * Suspense boundary above it, and one boundary around the whole app is cheaper than one
 * per screen — and keeps the screens from each growing a wrapper component.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  // Memoized on the query string, not on the params object: the layout above re-renders
  // on every clock tick, and a fresh Set each time would re-render every list in the app.
  const query = searchParams.toString()
  const ids = useMemo(() => {
    const focused = new URLSearchParams(query).getAll(FOCUS_PARAM)
    return focused.length === 0 ? EMPTY : new Set(focused)
  }, [query])

  return <FocusContext.Provider value={ids}>{children}</FocusContext.Provider>
}

export function useFocusedIds(): ReadonlySet<string> {
  return useContext(FocusContext)
}

/**
 * Brings the focused row into view, once the screen has the data to render it.
 *
 * `ready` matters: on arrival the list is still a skeleton, so there is nothing to
 * scroll to yet. It scrolls once per set of ids — re-running on every render would fight
 * the person the moment they scrolled away.
 */
export function useScrollToFocus(ready: boolean): void {
  const ids = useFocusedIds()
  const scrolledTo = useRef<string | null>(null)

  useEffect(() => {
    if (!ready || ids.size === 0) return
    const key = [...ids].join("|")
    if (scrolledTo.current === key) return

    const target = [...ids]
      .map((id) => document.getElementById(focusAnchorId(id)))
      .find((element) => element !== null)
    if (!target) return

    scrolledTo.current = key
    target.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [ready, ids])
}
