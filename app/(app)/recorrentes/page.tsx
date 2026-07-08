"use client"

import { useState } from "react"
import { MoreVertical, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { RecurringRuleForm } from "@/components/forms/RecurringRuleForm"
import { useAccounts } from "@/lib/hooks/useAccounts"
import { useCategories } from "@/lib/hooks/useCategories"
import {
  useCreateRecurringRule,
  useDeactivateRecurringRule,
  useRecurringRules,
} from "@/lib/hooks/useRecurringRules"
import { formatCentsBRL } from "@/lib/domain/money"
import { monthLabel } from "@/lib/domain/dateUtils"
import type { RecurringRuleFormValues } from "@/lib/validators/recurringRule"

export default function RecorrentesPage() {
  const { data: rules, isLoading } = useRecurringRules()
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const createRule = useCreateRecurringRule()
  const deactivateRule = useDeactivateRecurringRule()
  const [open, setOpen] = useState(false)

  async function handleCreate(values: RecurringRuleFormValues) {
    try {
      await createRule.mutateAsync(values)
      toast.success("Recorrência criada")
      setOpen(false)
    } catch {
      toast.error("Não foi possível criar a recorrência")
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateRule.mutateAsync(id)
      toast.success("Recorrência desativada")
    } catch {
      toast.error("Não foi possível desativar")
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recorrências</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nova recorrência
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova recorrência</DialogTitle>
            </DialogHeader>
            <RecurringRuleForm
              submitLabel="Criar recorrência"
              submitting={createRule.isPending}
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      )}

      {!isLoading && rules?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma recorrência cadastrada ainda. Crie uma para assinaturas, salário e outros lançamentos mensais.
        </p>
      )}

      <div className="grid gap-2">
        {rules?.map((rule) => {
          const account = accounts?.find((a) => a.id === rule.accountId)
          const category = categories?.find((c) => c.id === rule.categoryId)
          return (
            <div
              key={rule.id}
              className="border-border flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {rule.description}
                  {!rule.active && (
                    <Badge variant="secondary" className="text-xs">
                      Inativa
                    </Badge>
                  )}
                </p>
                <p className="text-muted-foreground text-xs">
                  {category?.name ?? "—"} · {account?.name ?? "—"} · dia {rule.dayOfMonth} · desde{" "}
                  {monthLabel(rule.startMonth)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    "text-sm font-medium " +
                    (rule.direction === "in" ? "text-emerald-600" : "text-foreground")
                  }
                >
                  {rule.direction === "in" ? "+" : "-"}
                  {formatCentsBRL(rule.amountCents)}
                </span>
                {rule.active && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreVertical className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeactivate(rule.id)}>
                        Desativar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
