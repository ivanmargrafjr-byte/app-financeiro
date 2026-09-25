"use client"

import { useState } from "react"
import { BellOff, Settings2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { AlertList } from "@/components/alerts/AlertList"
import { useAlerts } from "@/lib/hooks/useAlerts"
import { useSetMutedAlerts } from "@/lib/hooks/useAlertSettings"
import { ALERT_LABELS, type AlertKind } from "@/lib/domain/alerts"

const KINDS = Object.keys(ALERT_LABELS) as AlertKind[]

export default function AlertasPage() {
  const { alerts, isLoading, muted } = useAlerts()
  const setMuted = useSetMutedAlerts()
  const [showSettings, setShowSettings] = useState(false)

  async function toggle(kind: AlertKind, enabled: boolean) {
    const next = enabled ? muted.filter((k) => k !== kind) : [...muted, kind]
    try {
      await setMuted.mutateAsync(next)
    } catch {
      toast.error("Não foi possível salvar a preferência")
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Alertas</h1>
        <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
          <Settings2 className="size-4" />
          O que avisar
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              O que você quer ser avisado
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {KINDS.map((kind) => (
              <label key={kind} className="flex items-center justify-between gap-2 text-sm">
                {ALERT_LABELS[kind]}
                <Switch
                  checked={!muted.includes(kind)}
                  onCheckedChange={(checked) => toggle(kind, checked)}
                />
              </label>
            ))}
            <p className="text-muted-foreground text-xs">
              Desligar um tipo esconde esses avisos aqui e na tela de início. Nada é apagado —
              os números continuam nas telas de onde vêm.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <>
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </>
      ) : (
        <AlertList
          alerts={alerts}
          emptyLabel={
            muted.length === KINDS.length
              ? "Todos os tipos de aviso estão desligados."
              : "Nada pedindo atenção agora. O app avisa aqui quando algo mudar."
          }
        />
      )}

      {!isLoading && alerts.length > 0 && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <BellOff className="size-3.5" />
          Um aviso incomum é motivo para conferir, não prova de que algo está errado.
        </p>
      )}
    </div>
  )
}
