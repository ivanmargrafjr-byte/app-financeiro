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
import { CardForm } from "@/components/forms/CardForm"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCentsBRL, fromCents } from "@/lib/domain/money"
import type { Card as CardEntity } from "@/lib/types"
import {
  useArchivedCards,
  useCards,
  useCreateCard,
  useSetCardArchived,
  useSetCardArchivedFromMonth,
  useUpdateCard,
} from "@/lib/hooks/useCards"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CartoesPage() {
  const { data: cards, isLoading } = useCards()
  const { data: archivedCards } = useArchivedCards()
  const createCard = useCreateCard()
  const updateCard = useUpdateCard()
  const setCardArchived = useSetCardArchived()
  const setArchivedFromMonth = useSetCardArchivedFromMonth()
  const [open, setOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CardEntity | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  async function handleCreate(values: Parameters<typeof createCard.mutateAsync>[0]) {
    try {
      await createCard.mutateAsync(values)
      toast.success("Cartão criado")
      setOpen(false)
    } catch {
      toast.error("Não foi possível criar o cartão")
    }
  }

  async function handleUpdate(values: Parameters<typeof createCard.mutateAsync>[0]) {
    if (!editingCard) return
    try {
      await updateCard.mutateAsync({ id: editingCard.id, values })
      toast.success("Cartão atualizado")
      setEditingCard(null)
    } catch {
      toast.error("Não foi possível atualizar o cartão")
    }
  }

  async function handleSetArchived(id: string, archived: boolean) {
    try {
      await setCardArchived.mutateAsync({ id, archived })
      toast.success(archived ? "Cartão arquivado" : "Cartão desarquivado")
    } catch {
      toast.error(
        archived ? "Não foi possível arquivar o cartão" : "Não foi possível desarquivar o cartão"
      )
    }
  }

  async function handleCutoffChange(id: string, month: string) {
    try {
      await setArchivedFromMonth.mutateAsync({ id, month: month || null })
      toast.success(
        month ? "Mês de corte atualizado" : "Corte removido — o cartão volta a contar sempre"
      )
    } catch {
      toast.error("Não foi possível atualizar o mês de corte")
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Cartões</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Novo cartão
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cartão</DialogTitle>
            </DialogHeader>
            <CardForm
              submitLabel="Criar cartão"
              submitting={createCard.isPending}
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingCard} onOpenChange={(v) => !v && setEditingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cartão</DialogTitle>
          </DialogHeader>
          {editingCard && (
            <CardForm
              defaultValues={{
                name: editingCard.name,
                limit: fromCents(editingCard.limitCents),
                closingDay: editingCard.closingDay,
                dueDay: editingCard.dueDay,
                linkedAccountId: editingCard.linkedAccountId,
                icon: editingCard.icon,
                iconUrl: editingCard.iconUrl,
                color: editingCard.color,
              }}
              submitLabel="Salvar alterações"
              submitting={updateCard.isPending}
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

      {!isLoading && cards?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum cartão cadastrado ainda.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards?.map((card) => (
          <Card key={card.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <EntityIcon name={card.icon} color={card.color} imageUrl={card.iconUrl} />
                <Link href={`/cartoes/${card.id}`} className="hover:underline">
                  {card.name}
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
                  <DropdownMenuItem onClick={() => setEditingCard(card)}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetArchived(card.id, true)}>
                    Arquivar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Limite {formatCentsBRL(card.limitCents)}
              </p>
              <p className="text-muted-foreground text-sm">
                Fecha dia {card.closingDay} · Vence dia {card.dueDay}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!!archivedCards?.length && (
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "Ocultar" : "Mostrar"} arquivados ({archivedCards.length})
          </Button>

          {showArchived && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {archivedCards.map((card) => (
                <Card key={card.id} className="opacity-70">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2 text-base font-medium">
                      <EntityIcon name={card.icon} color={card.color} imageUrl={card.iconUrl} />
                      {card.name}
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetArchived(card.id, false)}
                    >
                      Desarquivar
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Limite {formatCentsBRL(card.limitCents)}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                      </p>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`corte-${card.id}`} className="text-xs">
                        Para de contar a partir de
                      </Label>
                      <Input
                        id={`corte-${card.id}`}
                        type="month"
                        defaultValue={card.archivedFromMonth ?? ""}
                        onChange={(e) => handleCutoffChange(card.id, e.target.value)}
                      />
                      <p className="text-muted-foreground text-xs">
                        Os meses anteriores continuam somando — só eles guardam esse
                        histórico. Em branco, o cartão soma em todos os meses.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
