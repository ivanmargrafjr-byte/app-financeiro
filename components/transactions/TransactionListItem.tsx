"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, MoreVertical } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { SettleTransactionDialog } from "@/components/transactions/SettleTransactionDialog"
import { formatCentsBRL } from "@/lib/domain/money"
import { useDeleteAccountTransaction, useReverseTransaction } from "@/lib/hooks/useTransactions"
import { useDeleteRecurringOccurrence } from "@/lib/hooks/useRecurringRules"
import { useReverseCardSettlement } from "@/lib/hooks/useInvoices"
import type { Transaction } from "@/lib/types"

export function TransactionListItem({
  tx,
  accountName,
}: {
  tx: Transaction
  /** Optional account label; pass when the list mixes transactions from multiple accounts. */
  accountName?: string
}) {
  const reverseTransaction = useReverseTransaction()
  const reverseCardSettlement = useReverseCardSettlement()
  const deleteTransaction = useDeleteAccountTransaction()
  const deleteRecurringOccurrence = useDeleteRecurringOccurrence()
  const [settleOpen, setSettleOpen] = useState(false)

  const isCard = tx.origin === "card"
  const paidViaCard = tx.settledVia === "card"
  // Card purchases are already committed to an invoice the moment they're created —
  // there's no separate "efetivar" step for them, so treat them as settled for display.
  const settled = isCard || tx.settled

  // A checked account entry that was paid with a card keeps its original date/month
  // as a historical marker, but the real (totaled) charge lives on the invoice.
  const faturaHref = isCard
    ? `/cartoes/${tx.cardId}/faturas/${tx.invoiceId}`
    : paidViaCard
      ? `/cartoes/${tx.linkedCardId}/faturas/${tx.linkedInvoiceId}`
      : null

  async function handleReverse() {
    try {
      await reverseTransaction.mutateAsync(tx.id)
      toast.success("Lançamento estornado")
    } catch {
      toast.error("Não foi possível estornar o lançamento")
    }
  }

  async function handleReverseCardSettlement() {
    try {
      await reverseCardSettlement.mutateAsync(tx.id)
      toast.success("Pagamento no cartão estornado — lançamento voltou a pendente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível estornar")
    }
  }

  async function handleDelete() {
    try {
      if (tx.recurringSeriesId) {
        await deleteRecurringOccurrence.mutateAsync({
          ruleId: tx.recurringSeriesId,
          month: tx.competenceMonth,
        })
      } else {
        await deleteTransaction.mutateAsync(tx.id)
      }
      toast.success("Lançamento excluído")
    } catch {
      toast.error("Não foi possível excluir o lançamento")
    }
  }

  return (
    <div className="border-border flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-3">
        <EntityIcon name={tx.categoryIcon} color={tx.categoryColor} />
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            {tx.description}
            {tx.recurringSeriesId && (
              <Badge variant="secondary" className="text-xs">
                Recorrente
              </Badge>
            )}
            {tx.installmentTotal && tx.installmentTotal > 1 && (
              <Badge variant="secondary" className="text-xs">
                {tx.installmentNumber}/{tx.installmentTotal}
              </Badge>
            )}
            {paidViaCard && (
              <Badge variant="secondary" className="text-xs">
                Pago no cartão
              </Badge>
            )}
            {!settled && (
              <Badge variant="outline" className="text-xs">
                Pendente
              </Badge>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {tx.categoryName}
            {accountName && ` · ${accountName}`} · {tx.date.split("-").reverse().join("/")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {settled && (
          <CheckCircle2 className="text-emerald-600 size-4" aria-label="Efetivada" />
        )}
        <span
          className={
            "text-sm font-medium " +
            (tx.direction === "in" ? "text-emerald-600" : "text-foreground")
          }
        >
          {tx.direction === "in" ? "+" : "-"}
          {formatCentsBRL(tx.amountCents)}
        </span>
        {isCard ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={faturaHref!} />}
          >
            Ver fatura
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreVertical className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {paidViaCard ? (
                <>
                  <DropdownMenuItem render={<Link href={faturaHref!} />}>
                    Ver fatura
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReverseCardSettlement}>
                    Estornar
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  {!settled && (
                    <DropdownMenuItem onClick={() => setSettleOpen(true)}>
                      Efetivar
                    </DropdownMenuItem>
                  )}
                  {settled && (
                    <DropdownMenuItem onClick={handleReverse}>Estornar</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleDelete}>Excluir</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {!isCard && !settled && (
        <SettleTransactionDialog tx={tx} open={settleOpen} onOpenChange={setSettleOpen} />
      )}
    </div>
  )
}
