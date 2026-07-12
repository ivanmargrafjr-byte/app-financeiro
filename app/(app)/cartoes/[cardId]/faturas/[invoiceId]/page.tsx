"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MoreVertical } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { EditCardTransactionDialog } from "@/components/transactions/EditCardTransactionDialog"
import { ImportInvoiceDialog } from "@/components/transactions/ImportInvoiceDialog"
import { useCards } from "@/lib/hooks/useCards"
import {
  useDeleteCardTransaction,
  useInvoice,
  useInvoiceTransactions,
  usePayInvoice,
} from "@/lib/hooks/useInvoices"
import { formatCentsBRL } from "@/lib/domain/money"
import { monthLabel } from "@/lib/domain/dateUtils"
import type { Transaction } from "@/lib/types"

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ cardId: string; invoiceId: string }>
}) {
  const { cardId, invoiceId } = use(params)
  const { data: cards } = useCards()
  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const { data: transactions, isLoading: isLoadingTx } = useInvoiceTransactions(invoiceId)
  const payInvoice = usePayInvoice()
  const deleteTransaction = useDeleteCardTransaction()
  const [paying, setPaying] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const card = cards?.find((c) => c.id === cardId)

  async function handlePay() {
    if (!invoice || !card) return
    setPaying(true)
    try {
      await payInvoice.mutateAsync({ invoice, card })
      toast.success("Fatura paga")
    } catch {
      toast.error("Não foi possível pagar a fatura")
    } finally {
      setPaying(false)
    }
  }

  async function handleDelete(transactionId: string) {
    try {
      await deleteTransaction.mutateAsync({ transactionId, invoiceId })
      toast.success("Lançamento excluído")
    } catch {
      toast.error("Não foi possível excluir (fatura já paga?)")
    }
  }

  return (
    <div className="grid gap-4">
      <Link
        href={`/cartoes/${cardId}`}
        className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        {card?.name ?? "Cartão"}
      </Link>

      {isLoading && <Skeleton className="h-20" />}

      {invoice && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold capitalize">
              {card && <EntityIcon name={card.icon} color={card.color} imageUrl={card.iconUrl} />}
              {monthLabel(invoice.referenceMonth)}
            </h1>
            <p className="text-muted-foreground text-sm">
              Fecha {invoice.closingDate.split("-").reverse().join("/")} · Vence{" "}
              {invoice.dueDate.split("-").reverse().join("/")}
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {formatCentsBRL(invoice.totalAmountCents)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={invoice.status === "paid" ? "secondary" : "default"}>
              {invoice.status === "paid" ? "Paga" : "Aberta"}
            </Badge>
            {invoice.status === "open" && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  Importar fatura
                </Button>
                <Button onClick={handlePay} disabled={paying}>
                  {paying ? "Pagando..." : "Pagar fatura"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoadingTx && (
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      <div className="grid gap-2">
        {transactions?.map((tx) => (
          <div
            key={tx.id}
            className="border-border flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <EntityIcon name={tx.categoryIcon} color={tx.categoryColor} imageUrl={tx.categoryIconUrl} />
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {tx.description}
                  {tx.installmentTotal && tx.installmentTotal > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {tx.installmentNumber}/{tx.installmentTotal}
                    </Badge>
                  )}
                </p>
                <p className="text-muted-foreground text-xs">
                  {tx.categoryName} · {tx.date.split("-").reverse().join("/")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatCentsBRL(tx.amountCents)}</span>
              {invoice?.status === "open" && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreVertical className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingTx(tx)}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(tx.id)}>
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </div>

      {editingTx && (
        <EditCardTransactionDialog
          tx={editingTx}
          open={!!editingTx}
          onOpenChange={(v) => !v && setEditingTx(null)}
        />
      )}
      {invoice && card && (
        <ImportInvoiceDialog
          invoice={invoice}
          card={card}
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}
    </div>
  )
}
