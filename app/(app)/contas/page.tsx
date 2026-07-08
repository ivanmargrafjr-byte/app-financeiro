"use client"

import { useState } from "react"
import Link from "next/link"
import { MoreVertical, Plus } from "lucide-react"
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
import { EntityIcon } from "@/components/forms/EntityIcon"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCentsBRL } from "@/lib/domain/money"
import { ACCOUNT_TYPE_LABELS, type Account } from "@/lib/types"
import {
  useAccounts,
  useArchiveAccount,
  useCreateAccount,
  useUpdateAccount,
} from "@/lib/hooks/useAccounts"

export default function ContasPage() {
  const { data: accounts, isLoading } = useAccounts()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const archiveAccount = useArchiveAccount()
  const [open, setOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

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

  async function handleArchive(id: string) {
    try {
      await archiveAccount.mutateAsync(id)
      toast.success("Conta arquivada")
    } catch {
      toast.error("Não foi possível arquivar a conta")
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contas</h1>
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
                <EntityIcon name={account.icon} color={account.color} />
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
                  <DropdownMenuItem onClick={() => handleArchive(account.id)}>
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
    </div>
  )
}
