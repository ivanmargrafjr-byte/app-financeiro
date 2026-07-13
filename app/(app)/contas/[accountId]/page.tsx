"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, SlidersHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { AdjustBalanceDialog } from "@/components/transactions/AdjustBalanceDialog"
import { useAccounts } from "@/lib/hooks/useAccounts"
import { useCategories } from "@/lib/hooks/useCategories"
import { useAccountTransactions, useCreateAccountTransaction } from "@/lib/hooks/useTransactions"
import { formatCentsBRL } from "@/lib/domain/money"
import { ACCOUNT_TYPE_LABELS } from "@/lib/types"
import type { AccountTransactionFormValues } from "@/lib/validators/transaction"

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = use(params)
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const { data: transactions, isLoading } = useAccountTransactions(accountId)
  const createTransaction = useCreateAccountTransaction()
  const [open, setOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)

  const account = accounts?.find((a) => a.id === accountId)

  async function handleCreate(values: AccountTransactionFormValues) {
    const category = categories?.find((c) => c.id === values.categoryId)
    if (!category) {
      toast.error("Selecione uma categoria válida")
      return
    }
    try {
      await createTransaction.mutateAsync({
        values: { ...values, accountId },
        category,
      })
      toast.success("Lançamento criado")
      setOpen(false)
    } catch {
      toast.error("Não foi possível criar o lançamento")
    }
  }

  return (
    <div className="grid gap-4">
      <Link
        href="/contas"
        className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        Contas
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {account && (
              <EntityIcon name={account.icon} color={account.color} imageUrl={account.iconUrl} />
            )}
            {account?.name ?? "Conta"}
          </h1>
          {account && (
            <p className="text-muted-foreground text-sm">
              {ACCOUNT_TYPE_LABELS[account.type]} · {formatCentsBRL(account.currentBalanceCents)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>
            <SlidersHorizontal className="size-4" />
            Ajustar saldo
          </Button>
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
                defaultValues={{ accountId }}
                submitLabel="Criar lançamento"
                submitting={createTransaction.isPending}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      {!isLoading && transactions?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum lançamento nesta conta ainda.
        </p>
      )}

      <div className="grid gap-2">
        {transactions?.map((tx) => (
          <TransactionListItem key={tx.id} tx={tx} />
        ))}
      </div>

      {account && (
        <AdjustBalanceDialog account={account} open={adjustOpen} onOpenChange={setAdjustOpen} />
      )}
    </div>
  )
}
