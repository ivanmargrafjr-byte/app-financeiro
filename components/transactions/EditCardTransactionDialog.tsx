"use client"

import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CardTransactionEditForm } from "@/components/forms/CardTransactionEditForm"
import { useCards } from "@/lib/hooks/useCards"
import { useCategories } from "@/lib/hooks/useCategories"
import { useUpdateCardTransaction } from "@/lib/hooks/useInvoices"
import { fromCents } from "@/lib/domain/money"
import type { Transaction } from "@/lib/types"
import type { CardTransactionEditFormValues } from "@/lib/validators/cardTransactionEdit"

export function EditCardTransactionDialog({
  tx,
  open,
  onOpenChange,
}: {
  tx: Transaction
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: cards } = useCards()
  const { data: categories } = useCategories()
  const updateCardTransaction = useUpdateCardTransaction()
  const card = cards?.find((c) => c.id === tx.cardId)

  async function handleSubmit(values: CardTransactionEditFormValues) {
    const category = categories?.find((c) => c.id === values.categoryId)
    if (!card || !category) {
      toast.error("Selecione uma categoria válida")
      return
    }
    try {
      await updateCardTransaction.mutateAsync({
        transactionId: tx.id,
        card,
        values,
        category,
      })
      toast.success("Lançamento atualizado")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o lançamento")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar compra</DialogTitle>
        </DialogHeader>
        <CardTransactionEditForm
          defaultValues={{
            description: tx.description,
            amount: fromCents(tx.amountCents),
            categoryId: tx.categoryId,
            date: tx.date,
          }}
          submitLabel="Salvar alterações"
          submitting={updateCardTransaction.isPending}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
