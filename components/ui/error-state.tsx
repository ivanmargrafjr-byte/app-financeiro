import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * What a list shows when loading it failed.
 *
 * Without this, a failed query looks exactly like an empty one ("Nenhum lançamento
 * ainda") and the user thinks their data is gone. Says what happened, that the data
 * is not lost, and offers a retry.
 */
function ErrorState({
  title = "Não foi possível carregar",
  children = "Seus dados continuam salvos. Verifique a conexão e tente de novo.",
  onRetry,
  className,
}: {
  title?: string
  children?: React.ReactNode
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "border-destructive/40 grid justify-items-center gap-2 rounded-xl border border-dashed px-5 py-8 text-center",
        className
      )}
    >
      <AlertTriangle className="text-destructive size-5" aria-hidden />
      <p className="text-foreground text-sm font-medium">{title}</p>
      {children && (
        <p className="text-muted-foreground mx-auto max-w-prose text-sm text-pretty">
          {children}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-1 h-11 px-4">
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export { ErrorState }
