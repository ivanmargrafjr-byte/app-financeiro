"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { TransactionForm } from "@/components/forms/TransactionForm"
import { TransactionListItem } from "@/components/transactions/TransactionListItem"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { useAccounts } from "@/lib/hooks/useAccounts"
import { useCards } from "@/lib/hooks/useCards"
import { useCategories } from "@/lib/hooks/useCategories"
import { useMonthInvoices } from "@/lib/hooks/useInvoices"
import { useCreateAccountTransaction, useMonthTransactions } from "@/lib/hooks/useTransactions"
import { formatCentsBRL } from "@/lib/domain/money"
import { monthLabel } from "@/lib/domain/dateUtils"
import { useMonth } from "@/lib/month/MonthProvider"
import type { AccountTransactionFormValues } from "@/lib/validators/transaction"

export default function TransacoesPage() {
  const { month } = useMonth()
  const { data: transactions, isLoading } = useMonthTransactions(month)
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const { data: categories } = useCategories()
  const { data: invoices, isLoading: isLoadingInvoices } = useMonthInvoices(month)
  const createTransaction = useCreateAccountTransaction()
  const [open, setOpen] = useState(false)

  const sourceLabel = (tx: { origin: string; accountId?: string; cardId?: string }) => {
    if (tx.origin === "card") return cards?.find((c) => c.id === tx.cardId)?.name ?? "—"
    return accounts?.find((a) => a.id === tx.accountId)?.name ?? "—"
  }

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

  const allTx = transactions ?? []

  const estimatedBalanceCents = useMemo(() => {
    const realBalance = accounts?.reduce((acc, a) => acc + a.currentBalanceCents, 0) ?? 0
    const pendingThisMonth = allTx
      .filter((t) => t.origin === "account" && !t.settled)
      .reduce((acc, t) => acc + (t.direction === "in" ? t.amountCents : -t.amountCents), 0)
    return realBalance + pendingThisMonth
  }, [accounts, allTx])

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transações</h1>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Saldo estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCentsBRL(estimatedBalanceCents)}</p>
          <p className="text-muted-foreground text-xs">
            Saldo atual das contas + lançamentos pendentes de {monthLabel(month).toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {!isLoadingInvoices && invoices && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Faturas do mês</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {invoices.map((invoice) => {
              const card = cards?.find((c) => c.id === invoice.cardId)
              return (
                <Link
                  key={invoice.id}
                  href={`/cartoes/${invoice.cardId}/faturas/${invoice.id}`}
                  className="border-border flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {card && <EntityIcon name={card.icon} color={card.color} />}
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
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      {!isLoading && allTx.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum lançamento neste mês ainda.
        </p>
      )}

      <div className="grid gap-2">
        {allTx.map((tx) => (
          <TransactionListItem key={tx.id} tx={tx} accountName={sourceLabel(tx)} />
        ))}
      </div>
    </div>
  )
}
