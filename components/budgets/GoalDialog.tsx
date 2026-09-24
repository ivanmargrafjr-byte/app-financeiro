"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fromCents, toCents } from "@/lib/domain/money"
import { todayDateString } from "@/lib/domain/dateUtils"
import type { Goal, GoalKind } from "@/lib/domain/goals"
import type { GoalInput } from "@/lib/hooks/useGoals"

const DEFAULTS: Record<GoalKind, { icon: string; color: string; title: string; hint: string }> = {
  meta: {
    icon: "Target",
    color: "#5a12d6",
    title: "Meta",
    hint: "Uma reserva, uma viagem, uma compra. Quanto você quer juntar e até quando.",
  },
  anual: {
    icon: "CalendarClock",
    color: "#b45309",
    title: "Despesa anual",
    hint: "IPVA, seguro, matrícula. O app divide o valor pelos meses que faltam.",
  },
}

export function GoalDialog({
  kind,
  goal,
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  submitting,
}: {
  kind: GoalKind
  /** Present when editing; absent when creating. */
  goal?: Goal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: GoalInput) => Promise<void>
  onDelete?: () => Promise<void>
  submitting?: boolean
}) {
  const defaults = DEFAULTS[kind]
  // Seeded once from the props: the caller gives this a key that changes with the
  // goal, so a new dialog is a new component rather than an effect resetting state.
  const [name, setName] = useState(goal?.name ?? "")
  const [target, setTarget] = useState(goal ? String(fromCents(goal.targetCents)) : "")
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? todayDateString())

  async function submit() {
    const reais = Number(target.replace(",", "."))
    if (!name.trim()) {
      toast.error("Dê um nome")
      return
    }
    if (!Number.isFinite(reais) || reais <= 0) {
      toast.error("Informe um valor maior que zero")
      return
    }
    try {
      await onSubmit({
        kind,
        name: name.trim(),
        targetCents: toCents(reais),
        dueDate,
        icon: goal?.icon ?? defaults.icon,
        color: goal?.color ?? defaults.color,
      })
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível salvar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {goal ? "Editar" : "Nova"} {defaults.title.toLowerCase()}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-muted-foreground text-sm">{defaults.hint}</p>
          <div className="grid gap-1.5">
            <Label htmlFor="goal-nome">Nome</Label>
            <Input
              id="goal-nome"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "meta" ? "Viagem" : "IPVA"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="goal-valor">Valor (R$)</Label>
              <Input
                id="goal-valor"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-data">
                {kind === "meta" ? "Quando quer ter" : "Quando vence"}
              </Label>
              <Input
                id="goal-data"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={submitting} className="flex-1">
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
            {onDelete && (
              <Button variant="outline" onClick={onDelete} disabled={submitting}>
                Excluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
