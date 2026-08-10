"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MoreVertical } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { EditCardTransactionDialog } from "@/components/transactions/EditCardTransactionDialog"
import { ImportInvoiceDialog } from "@/components/transactions/ImportInvoiceDialog"
import { useCards } from "@/lib/hooks/useCards"
import {
  useDeleteCardTransaction,
  useDeleteCardTransactions,
  useInvoice,
  useInvoiceTransactions,
  usePayInvoice,
} from "@/lib/hooks/useInvoices"
import { formatCentsBRL } from "@/lib/domain/money"
import { monthLabel, monthOfDate } from "@/lib/domain/dateUtils"
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
  const deleteTransactions = useDeleteCardTransactions()
  const [paying, setPaying] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const card = cards?.find((c) => c.id === cardId)

  function toggleSelected(transactionId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(transactionId)
      else next.delete(transactionId)
      return next
    })
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(transactions?.map((tx) => tx.id)) : new Set())
  }

  function exitSelectionMode() {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    try {
      await deleteTransactions.mutateAsync({ transactionIds: [...selectedIds], invoiceId })
      toast.success(
        selectedIds.size === 1 ? "Lançamento excluído" : `${selectedIds.size} lançamentos excluídos`
      )
      exitSelectionMode()
    } catch {
      toast.error("Não foi possível excluir (fatura já paga?)")
    }
  }

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
    <div className="grid grid-cols-1 gap-4">
      <Link
        href={`/cartoes/${cardId}`}
        className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        {card?.name ?? "Cartão"}
      </Link>

      {isLoading && <Skeleton className="h-20" />}

      {invoice && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold capitalize">
              {card && <EntityIcon name={card.icon} color={card.color} imageUrl={card.iconUrl} />}
              {monthLabel(monthOfDate(invoice.dueDate))}
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
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      {invoice?.status === "open" && !!transactions?.length && (
        <div className="flex items-center justify-between gap-2">
          {selecting ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedIds.size > 0 && selectedIds.size === transactions.length}
                  onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                />
                {selectedIds.size > 0 ? `${selectedIds.size} selecionado(s)` : "Selecionar todos"}
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
                  Cancelar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="destructive" size="sm" disabled={selectedIds.size === 0} />
                    }
                  >
                    Excluir selecionados
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Excluir {selectedIds.size} lançamento{selectedIds.size === 1 ? "" : "s"}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa ação não pode ser desfeita. O total da fatura será atualizado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleBulkDelete}
                        disabled={deleteTransactions.isPending}
                      >
                        {deleteTransactions.isPending ? "Excluindo..." : "Excluir permanentemente"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setSelecting(true)}>
              Selecionar
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {transactions?.map((tx) => (
          <div
            key={tx.id}
            className={
              "border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2" +
              (selecting ? " cursor-pointer select-none" : "")
            }
            onClick={selecting ? () => toggleSelected(tx.id, !selectedIds.has(tx.id)) : undefined}
          >
            <div className="flex min-w-0 items-center gap-3">
              {selecting && (
                <Checkbox
                  checked={selectedIds.has(tx.id)}
                  onCheckedChange={(checked) => toggleSelected(tx.id, checked === true)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <EntityIcon name={tx.categoryIcon} color={tx.categoryColor} imageUrl={tx.categoryIconUrl} />
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="min-w-0 truncate">{tx.description}</span>
                  {tx.installmentTotal && tx.installmentTotal > 1 && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {tx.installmentNumber}/{tx.installmentTotal}
                    </Badge>
                  )}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {tx.categoryName} · {tx.date.split("-").reverse().join("/")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-medium">{formatCentsBRL(tx.amountCents)}</span>
              {invoice?.status === "open" && !selecting && (
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
