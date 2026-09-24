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
import { formatCentsBRL, toCents } from "@/lib/domain/money"
import { goalProgress, type Goal } from "@/lib/domain/goals"

/**
 * Puts money away for a goal — or takes it back.
 *
 * Suggests the monthly figure the goal needs, since that is the amount someone is
 * usually acting on when they open this.
 */
export function SaveIntoGoalDialog({
  goal,
  today,
  open,
  onOpenChange,
  onSave,
  submitting,
}: {
  goal: Goal | null
  today: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (deltaCents: number) => Promise<void>
  submitting?: boolean
}) {
  const suggested = goal ? goalProgress(goal, today).monthlyCents : 0
  // Seeded once, like GoalDialog: the caller keys this by goal id.
  const [value, setValue] = useState(suggested > 0 ? String(suggested / 100) : "")

  async function submit(sign: 1 | -1) {
    const reais = Number(value.replace(",", "."))
    if (!Number.isFinite(reais) || reais <= 0) {
      toast.error("Informe um valor maior que zero")
      return
    }
    try {
      await onSave(sign * toCents(reais))
      toast.success(sign > 0 ? "Valor guardado" : "Valor retirado")
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível salvar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar em {goal?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-muted-foreground text-sm">
            {suggested > 0
              ? `Para chegar na data, esta meta pede ${formatCentsBRL(suggested)} por mês.`
              : "Esta meta já está completa."}{" "}
            O dinheiro continua na conta — ele só deixa de contar como livre para gastar.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="guardar-valor">Valor (R$)</Label>
            <Input
              id="guardar-valor"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => submit(1)} disabled={submitting} className="flex-1">
              Guardar
            </Button>
            <Button variant="outline" onClick={() => submit(-1)} disabled={submitting}>
              Retirar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
