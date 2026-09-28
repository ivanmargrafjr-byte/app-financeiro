"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { CashFlowChart } from "@/components/cashflow/CashFlowChart"
import { CashFlowDays } from "@/components/cashflow/CashFlowDays"
import { CashFlowSummary } from "@/components/cashflow/CashFlowSummary"
import { SimulatorDialog } from "@/components/cashflow/SimulatorDialog"
import { useAccounts } from "@/lib/hooks/useAccounts"
import { useArchivedCards, useCards } from "@/lib/hooks/useCards"
import { useOpenInvoices } from "@/lib/hooks/useInvoices"
import { usePendingTransactions } from "@/lib/hooks/useTransactions"
import { buildCashFlow, type CashFlowItem } from "@/lib/domain/cashFlow"
import { todayDateString } from "@/lib/domain/dateUtils"
import { useFocusedIds, useScrollToFocus } from "@/lib/navigation/FocusProvider"
import { cn } from "@/lib/utils"

const HORIZONS = [30, 60, 90] as const

export default function FluxoPage() {
  // Frozen for the life of the screen: a date that moved mid-session would slide
  // every day in the list under the user.
  const [today] = useState(() => todayDateString())
  const [days, setDays] = useState<number>(30)
  const [simulated, setSimulated] = useState<CashFlowItem[]>([])
  const [confirmedIncomeOnly, setConfirmedIncomeOnly] = useState(false)

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: cards, isLoading: loadingCards } = useCards()
  const { data: archivedCards, isLoading: loadingArchived } = useArchivedCards()
  const { data: openInvoices, isLoading: loadingInvoices } = useOpenInvoices()
  const { data: pending, isLoading: loadingPending } = usePendingTransactions()

  const isLoading =
    loadingAccounts || loadingCards || loadingArchived || loadingInvoices || loadingPending

  // The saldo alert points at the day the projection turns negative.
  const focusedIds = useFocusedIds()
  useScrollToFocus(!isLoading)

  const flow = useMemo(() => {
    const activeAccountIds = new Set((accounts ?? []).map((a) => a.id))
    return buildCashFlow({
      today,
      days,
      balanceCents: (accounts ?? []).reduce((total, a) => total + a.currentBalanceCents, 0),
      // An archived account's entries must not move a projection whose starting
      // balance no longer counts that account.
      transactions: (pending ?? []).filter(
        (t) => !t.accountId || activeAccountIds.has(t.accountId)
      ),
      openInvoices: openInvoices ?? [],
      cardsById: new Map([...(cards ?? []), ...(archivedCards ?? [])].map((c) => [c.id, c])),
      simulated,
      confirmedIncomeOnly,
    })
  }, [accounts, cards, archivedCards, openInvoices, pending, simulated, today, days, confirmedIncomeOnly])

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Fluxo de caixa</h1>
        <div className="flex items-center gap-2">
          <div className="bg-muted flex rounded-lg p-0.5">
            {HORIZONS.map((horizon) => (
              <button
                key={horizon}
                type="button"
                onClick={() => setDays(horizon)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  days === horizon ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {horizon} dias
              </button>
            ))}
          </div>
          <SimulatorDialog onSimulate={(items) => setSimulated((prev) => [...prev, ...items])} />
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3">
          <CashFlowChart flow={flow} hidden={false} />
          <CashFlowSummary flow={flow} days={days} />
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>
              Cenário prudente
              <span className="text-muted-foreground block text-xs">
                Deixa de fora as receitas marcadas como apenas esperadas.
              </span>
            </span>
            <Switch
              checked={confirmedIncomeOnly}
              onCheckedChange={(checked) => setConfirmedIncomeOnly(checked)}
            />
          </label>
        </CardContent>
      </Card>

      {simulated.length > 0 && (
        <div className="border-primary/40 bg-primary/5 flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <p className="text-sm">
            Simulação ativa: {simulated.length}{" "}
            {simulated.length === 1 ? "lançamento" : "lançamentos"} que não existem de verdade.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setSimulated([])}>
            <X className="size-4" />
            Limpar
          </Button>
        </div>
      )}

      <CashFlowDays flow={flow} days={days} focusedIds={focusedIds} />
    </div>
  )
}
