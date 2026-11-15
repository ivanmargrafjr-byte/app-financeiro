"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeftRight, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { TransactionForm } from "@/components/forms/TransactionForm"
import { TransferForm } from "@/components/forms/TransferForm"
import { TransactionListItem } from "@/components/transactions/TransactionListItem"
import { ImportHistory } from "@/components/imports/ImportHistory"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { useAccounts } from "@/lib/hooks/useAccounts"
import { useImports, useUndoImport, type ImportBatch } from "@/lib/hooks/useImports"
import { useArchivedCards, useCards } from "@/lib/hooks/useCards"
import { useCategories } from "@/lib/hooks/useCategories"
import { useMonthInvoices, useOpenInvoices } from "@/lib/hooks/useInvoices"
import {
  useCreateAccountTransaction,
  useCreateTransfer,
  useMonthTransactions,
  usePendingTransactions,
} from "@/lib/hooks/useTransactions"
import { formatCentsBRL } from "@/lib/domain/money"
import { monthLabel, monthOfDate, todayDateString } from "@/lib/domain/dateUtils"
import { cardCountsInMonth } from "@/lib/domain/cardCutoff"
import { estimateBalanceThrough, estimateHorizon } from "@/lib/domain/homeSummary"
import { useMonth } from "@/lib/month/MonthProvider"
import { useFocusedIds, useScrollToFocus } from "@/lib/navigation/FocusProvider"
import type { AccountTransactionFormValues } from "@/lib/validators/transaction"
import type { TransferFormValues } from "@/lib/validators/transfer"

const PAGE_SIZE = 50

export default function TransacoesPage() {
  const { month } = useMonth()
  const { data: transactions, isLoading, isError, refetch } = useMonthTransactions(month)
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const { data: archivedCards } = useArchivedCards()
  const { data: categories } = useCategories()
  const { data: invoices, isLoading: isLoadingInvoices } = useMonthInvoices(month)
  const { data: pendingTransactions } = usePendingTransactions()
  const { data: openInvoices } = useOpenInvoices()
  const createTransaction = useCreateAccountTransaction()
  const createTransfer = useCreateTransfer()
  const { data: imports } = useImports()
  const undoImport = useUndoImport()
  const [open, setOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  // Frozen for the life of the screen, as on the tela de início: a date that moved
  // mid-session would slide the estimate's horizon under the user.
  const [today] = useState(() => todayDateString())

  // An alert can land here pointing at one entry — see AlertList.
  const focusedIds = useFocusedIds()
  useScrollToFocus(!isLoading)

  // visibleTx below never includes origin==='card' entries, so this only ever looks up accounts.
  const sourceLabel = (tx: { accountId?: string }) =>
    accounts?.find((a) => a.id === tx.accountId)?.name ?? "—"

  async function handleCreate(values: AccountTransactionFormValues) {
    const category = categories?.find((c) => c.id === values.categoryId)
    if (!category) {
      toast.error("Selecione uma categoria válida")
      return
    }
    try {
      await createTransaction.mutateAsync({ values, category })
      toast.success("Lançamento criado")
      setOpen(false)
    } catch {
      toast.error("Não foi possível criar o lançamento")
    }
  }

  async function handleTransfer(values: TransferFormValues) {
    const fromAccount = accounts?.find((a) => a.id === values.fromAccountId)
    const toAccount = accounts?.find((a) => a.id === values.toAccountId)
    if (!fromAccount || !toAccount) {
      toast.error("Selecione contas válidas")
      return
    }
    try {
      await createTransfer.mutateAsync({ fromAccount, toAccount, values })
      toast.success("Transferência realizada")
      setTransferOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível transferir")
    }
  }

  // An archived card's faturas still belong to the months before its replacement took
  // over — those exist nowhere else, and the dashboard counts them. From its cutoff
  // month on they're a stale duplicate, so they drop out here exactly as they do
  // there. Skip the filter while either list is still loading, or this would flash
  // empty on every page load.
  const visibleInvoices = useMemo(() => {
    if (!invoices) return []
    if (!cards || !archivedCards) return invoices
    const activeCardIds = new Set(cards.map((c) => c.id))
    const archivedById = new Map(archivedCards.map((c) => [c.id, c]))
    return invoices.filter((invoice) => {
      // A fatura whose card is neither list is orphaned — it would render as a
      // nameless "Cartão" row, so keep it out as before.
      const known = activeCardIds.has(invoice.cardId) || archivedById.has(invoice.cardId)
      return known && cardCountsInMonth(archivedById.get(invoice.cardId), month)
    })
  }, [invoices, cards, archivedCards, month])

  // Same reasoning as visibleInvoices above, for accounts: an archived account's
  // entries would otherwise linger with a "—" source label, and its pending entries
  // would still move an estimate whose real balance no longer counts that account.
  const allTx = useMemo(() => {
    const tx = transactions ?? []
    if (!accounts) return tx
    const activeAccountIds = new Set(accounts.map((a) => a.id))
    return tx.filter((t) => !t.accountId || activeAccountIds.has(t.accountId))
  }, [transactions, accounts])

  // Card purchases are represented consolidated in the "Faturas do mês" card above —
  // showing every individual purchase here too would duplicate that (and get noisy
  // fast once imported faturas add many line items). Click into a fatura to see them.
  const monthTx = allTx.filter((t) => t.origin !== "card")

  // Search within the month, and show the list in pages so a month with hundreds of
  // entries doesn't render (and scroll) all at once. The page count resets whenever
  // the search or the month changes.
  const [search, setSearch] = useState("")
  const term = search.trim().toLocaleLowerCase("pt-BR")
  const visibleTx = term
    ? monthTx.filter(
        (t) =>
          t.description.toLocaleLowerCase("pt-BR").includes(term) ||
          (t.categoryName ?? "").toLocaleLowerCase("pt-BR").includes(term)
      )
    : monthTx
  const limitKey = `${month}|${term}`
  const [limitState, setLimitState] = useState({ key: limitKey, count: PAGE_SIZE })
  const limit = limitState.key === limitKey ? limitState.count : PAGE_SIZE
  const shownTx = visibleTx.slice(0, limit)

  // Deliberately not built from the month's transactions like the list below: a
  // pendência from an earlier month is still owed, and scoping the estimate to the
  // viewed month made every one of them vanish when the month turned.
  const horizonMonth = monthOfDate(estimateHorizon(today, month))

  const estimatedBalanceCents = useMemo(() => {
    const activeAccountIds = new Set((accounts ?? []).map((a) => a.id))
    const cardsById = new Map([...(cards ?? []), ...(archivedCards ?? [])].map((c) => [c.id, c]))

    return estimateBalanceThrough({
      throughDate: estimateHorizon(today, month),
      balanceCents: accounts?.reduce((acc, a) => acc + a.currentBalanceCents, 0) ?? 0,
      // Same reasoning as allTx: an archived account's pendências must not move an
      // estimate whose real balance no longer counts that account.
      transactions: (pendingTransactions ?? []).filter(
        (t) => !t.accountId || activeAccountIds.has(t.accountId)
      ),
      openInvoices: openInvoices ?? [],
      cardsById,
    })
  }, [accounts, cards, archivedCards, pendingTransactions, openInvoices, today, month])

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Transações</h1>
        <div className="flex gap-2">
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="size-4" />
              Transferir
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transferência entre contas</DialogTitle>
              </DialogHeader>
              <TransferForm
                submitLabel="Transferir"
                submitting={createTransfer.isPending}
                onSubmit={handleTransfer}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Novo lançamento
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo lançamento</DialogTitle>
              </DialogHeader>
              <TransactionForm
                submitLabel="Criar lançamento"
                submitting={createTransaction.isPending}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Saldo estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCentsBRL(estimatedBalanceCents)}</p>
          <p className="text-muted-foreground text-xs">
            Saldo atual das contas + lançamentos pendentes − faturas em aberto, incluindo
            o que está atrasado, até o fim de {monthLabel(horizonMonth).toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {!!imports?.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Importações recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImportHistory
              imports={imports.slice(0, 5)}
              accountNameById={new Map((accounts ?? []).map((a) => [a.id, a.name]))}
              undoing={undoImport.isPending}
              onUndo={async (batch: ImportBatch) => {
                try {
                  await undoImport.mutateAsync(batch)
                  toast.success("Importação desfeita")
                } catch {
                  toast.error("Não foi possível desfazer")
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {!isLoadingInvoices && visibleInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Faturas do mês</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            {visibleInvoices.map((invoice) => {
              const card = cards?.find((c) => c.id === invoice.cardId)
              return (
                <Link
                  key={invoice.id}
                  href={`/cartoes/${invoice.cardId}/faturas/${invoice.id}`}
                  className="border-border bg-muted flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted-strong"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {card && <EntityIcon name={card.icon} color={card.color} imageUrl={card.iconUrl} />}
                    {card?.name ?? "Cartão"}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatCentsBRL(invoice.totalAmountCents)}
                    </span>
                    <Badge variant={invoice.status === "paid" ? "secondary" : "default"}>
                      {invoice.status === "paid" ? "Paga" : "Aberta"}
                    </Badge>
                  </span>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && monthTx.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="search"
            aria-label="Buscar lançamento por descrição ou categoria"
            placeholder="Buscar por descrição ou categoria"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 max-w-sm"
          />
          {term && (
            <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
              {visibleTx.length} de {monthTx.length} lançamentos
            </p>
          )}
        </div>
      )}

      {!isLoading && !isError && monthTx.length === 0 && (
        <EmptyState title="Nenhum lançamento neste mês ainda" />
      )}

      {!isLoading && !isError && monthTx.length > 0 && visibleTx.length === 0 && (
        <EmptyState title="Nenhum lançamento encontrado">
          Tente outro trecho da descrição ou da categoria.
        </EmptyState>
      )}

      <div className="grid grid-cols-1 gap-2">
        {shownTx.map((tx) => (
          <TransactionListItem
            key={tx.id}
            tx={tx}
            accountName={sourceLabel(tx)}
            focused={focusedIds.has(tx.id)}
          />
        ))}
      </div>

      {visibleTx.length > shownTx.length && (
        <Button
          variant="outline"
          className="h-11 justify-self-center px-4"
          onClick={() => setLimitState({ key: limitKey, count: limit + PAGE_SIZE })}
        >
          Mostrar mais ({visibleTx.length - shownTx.length} restantes)
        </Button>
      )}
    </div>
  )
}
