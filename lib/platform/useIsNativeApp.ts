"use client"

import { useSyncExternalStore } from "react"
import { Capacitor } from "@capacitor/core"

/** Nothing to subscribe to: whether this is the installed app never changes mid-session. */
const subscribe = () => () => {}

/**
 * Whether the page is running inside the installed app rather than a browser.
 *
 * Read through useSyncExternalStore so the prerender and the first client render
 * agree — reading Capacitor during render would make the static HTML claim one thing
 * and the hydrated page another, which is how a store button flashes on screen inside
 * the app before disappearing.
 */
export function useIsNativeApp(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => Capacitor.isNativePlatform(),
    () => false
  )
}
