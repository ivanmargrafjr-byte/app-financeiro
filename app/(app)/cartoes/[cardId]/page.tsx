"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { CardPurchaseForm } from "@/components/forms/CardPurchaseForm"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { useCards } from "@/lib/hooks/useCards"
import { useCategories } from "@/lib/hooks/useCategories"
import { useCardInvoices, useCreateCardPurchase } from "@/lib/hooks/useInvoices"
import { formatCentsBRL } from "@/lib/domain/money"
import { monthLabel, monthOfDate } from "@/lib/domain/dateUtils"
import type { CardPurchaseFormValues } from "@/lib/validators/cardPurchase"

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string }>
}) {
  const { cardId } = use(params)
  const { data: cards } = useCards()
  const { data: categories } = useCategories()
  const { data: invoices, isLoading } = useCardInvoices(cardId)
  const createPurchase = useCreateCardPurchase()
  const [open, setOpen] = useState(false)

  const card = cards?.find((c) => c.id === cardId)

  async function handleCreate(values: CardPurchaseFormValues) {
    const category = categories?.find((c) => c.id === values.categoryId)
    if (!card || !category) {
      toast.error("Selecione uma categoria válida")
      return
    }
    try {
      await createPurchase.mutateAsync({ card, values, category })
      toast.success("Compra lançada")
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível lançar a compra")
    }
  }

  return (
    <div className="grid gap-4">
      <Link
        href="/cartoes"
        className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        Cartões
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            {card && <EntityIcon name={card.icon} color={card.color} imageUrl={card.iconUrl} />}
            {card?.name ?? "Cartão"}
          </h1>
          {card && (
            <p className="text-muted-foreground text-sm">
              Limite {formatCentsBRL(card.limitCents)} · Fecha dia {card.closingDay} · Vence dia{" "}
              {card.dueDay}
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nova compra
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova compra</DialogTitle>
            </DialogHeader>
            <CardPurchaseForm
              submitLabel="Lançar compra"
              submitting={createPurchase.isPending}
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

      {!isLoading && invoices?.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma fatura ainda.</p>
      )}

      <div className="grid gap-2">
        {invoices?.map((invoice) => (
          <Link
            key={invoice.id}
            href={`/cartoes/${cardId}/faturas/${invoice.id}`}
            className="border-border flex items-center justify-between rounded-md border px-3 py-3 hover:bg-accent"
          >
            <div>
              <p className="text-sm font-medium capitalize">
                {monthLabel(monthOfDate(invoice.dueDate))}
              </p>
              <p className="text-muted-foreground text-xs">
                Fecha {invoice.closingDate.split("-").reverse().join("/")} · Vence{" "}
                {invoice.dueDate.split("-").reverse().join("/")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatCentsBRL(invoice.totalAmountCents)}</span>
              <Badge variant={invoice.status === "paid" ? "secondary" : "default"}>
                {invoice.status === "paid" ? "Paga" : "Aberta"}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
