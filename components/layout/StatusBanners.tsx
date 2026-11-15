"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, useSyncExternalStore } from "react"
import { CloudOff, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

/** True while the browser reports no connection. Server render assumes online. */
export function useIsOffline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => !navigator.onLine,
    () => false
  )
}

/** Number of queries currently in an error state, kept live from the query cache. */
function useFailedQueryCount() {
  const client = useQueryClient()
  const [count, setCount] = useState(0)
  useEffect(() => {
    const cache = client.getQueryCache()
    const update = () =>
      setCount(cache.findAll({ predicate: (q) => q.state.status === "error" }).length)
    update()
    return cache.subscribe(update)
  }, [client])
  return count
}

/**
 * Two page-wide notices, announced politely to screen readers:
 * - offline: what's on screen may be out of date;
 * - failed loads: some data could not be fetched, with one retry for all of it.
 */
export function StatusBanners() {
  const client = useQueryClient()
  const offline = useIsOffline()
  const failed = useFailedQueryCount()
  const [retrying, setRetrying] = useState(false)

  async function retry() {
    setRetrying(true)
    try {
      await client.refetchQueries({
        predicate: (q) => q.state.status === "error",
      })
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div role="status" aria-live="polite" className="grid gap-0">
      {offline && (
        <p className="bg-muted text-foreground flex items-center gap-2 border-b px-4 py-2 text-sm md:px-6">
          <CloudOff className="size-4 shrink-0" aria-hidden />
          Você está sem conexão. Os dados na tela podem estar desatualizados.
        </p>
      )}
      {!offline && failed > 0 && (
        <div className="bg-destructive/10 text-foreground flex flex-wrap items-center gap-2 border-b px-4 py-2 text-sm md:px-6">
          <span className="flex-1">
            Não foi possível carregar parte dos dados. Eles continuam salvos.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={retry}
            disabled={retrying}
          >
            <RefreshCw className={retrying ? "animate-spin" : undefined} aria-hidden />
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  )
}
