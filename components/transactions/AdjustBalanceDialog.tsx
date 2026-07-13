"use client"

import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AdjustBalanceForm } from "@/components/forms/AdjustBalanceForm"
import { useCreateBalanceAdjustment } from "@/lib/hooks/useTransactions"
import type { Account } from "@/lib/types"
import type { BalanceAdjustmentFormValues } from "@/lib/validators/balanceAdjustment"

export function AdjustBalanceDialog({
  account,
  open,
  onOpenChange,
}: {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createAdjustment = useCreateBalanceAdjustment()

  async function handleSubmit(values: BalanceAdjustmentFormValues) {
    try {
      await createAdjustment.mutateAsync({ account, values })
      toast.success("Saldo ajustado")
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível ajustar o saldo")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar saldo — {account.name}</DialogTitle>
        </DialogHeader>
        <AdjustBalanceForm
          currentBalanceCents={account.currentBalanceCents}
          submitLabel="Ajustar saldo"
          submitting={createAdjustment.isPending}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
