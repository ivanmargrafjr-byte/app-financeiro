"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeftRight, MoreVertical, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AccountForm } from "@/components/forms/AccountForm"
import { TransferForm } from "@/components/forms/TransferForm"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { AdjustBalanceDialog } from "@/components/transactions/AdjustBalanceDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCentsBRL } from "@/lib/domain/money"
import { ACCOUNT_TYPE_LABELS, type Account } from "@/lib/types"
import {
  useAccounts,
  useArchivedAccounts,
  useCreateAccount,
  useSetAccountArchived,
  useUpdateAccount,
} from "@/lib/hooks/useAccounts"
import { useCreateTransfer } from "@/lib/hooks/useTransactions"
import type { TransferFormValues } from "@/lib/validators/transfer"

export default function ContasPage() {
  const { data: accounts, isLoading } = useAccounts()
  const { data: archivedAccounts } = useArchivedAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const setAccountArchived = useSetAccountArchived()
  const createTransfer = useCreateTransfer()
  const [open, setOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  async function handleCreate(values: Parameters<typeof createAccount.mutateAsync>[0]) {
    try {
      await createAccount.mutateAsync(values)
      toast.success("Conta criada")
      setOpen(false)
    } catch {
      toast.error("Não foi possível criar a conta")
    }
  }

  async function handleUpdate(values: Parameters<typeof createAccount.mutateAsync>[0]) {
    if (!editingAccount) return
    try {
      await updateAccount.mutateAsync({ id: editingAccount.id, values })
      toast.success("Conta atualizada")
      setEditingAccount(null)
    } catch {
      toast.error("Não foi possível atualizar a conta")
    }
  }

  async function handleSetArchived(id: string, archived: boolean) {
    try {
      await setAccountArchived.mutateAsync({ id, archived })
      toast.success(archived ? "Conta arquivada" : "Conta desarquivada")
    } catch {
      toast.error(
        archived ? "Não foi possível arquivar a conta" : "Não foi possível desarquivar a conta"
      )
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

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Contas</h1>
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
              Nova conta
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova conta</DialogTitle>
              </DialogHeader>
              <AccountForm
                submitLabel="Criar conta"
                submitting={createAccount.isPending}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editingAccount} onOpenChange={(v) => !v && setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar conta</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <AccountForm
              defaultValues={{
                name: editingAccount.name,
                type: editingAccount.type,
                icon: editingAccount.icon,
                iconUrl: editingAccount.iconUrl,
                color: editingAccount.color,
              }}
              submitLabel="Salvar alterações"
              submitting={updateAccount.isPending}
              onSubmit={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {!isLoading && accounts?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma conta cadastrada ainda. Crie a primeira para começar a lançar receitas e despesas.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts?.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <EntityIcon name={account.icon} color={account.color} imageUrl={account.iconUrl} />
                <Link href={`/contas/${account.id}`} className="hover:underline">
                  {account.name}
                </Link>
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="size-7">
                      <MoreVertical className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingAccount(account)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAdjustingAccount(account)}>
                    Ajustar saldo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetArchived(account.id, true)}>
                    Arquivar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCentsBRL(account.currentBalanceCents)}
              </p>
              <p className="text-muted-foreground text-sm">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!!archivedAccounts?.length && (
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Ocultar" : "Mostrar"} arquivadas ({archivedAccounts.length})
          </Button>

          {showArchived && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archivedAccounts.map((account) => (
                <Card key={account.id} className="opacity-70">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                      <EntityIcon
                        name={account.icon}
                        color={account.color}
                        imageUrl={account.iconUrl}
                      />
                      {account.name}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetArchived(account.id, false)}
                    >
                      Desarquivar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {formatCentsBRL(account.currentBalanceCents)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {adjustingAccount && (
        <AdjustBalanceDialog
          account={adjustingAccount}
          open={!!adjustingAccount}
          onOpenChange={(v) => !v && setAdjustingAccount(null)}
        />
      )}
    </div>
  )
}
