"use client"

import { useState } from "react"
import { FlaskConical } from "lucide-react"
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
import { addMonths, monthOfDate, todayDateString } from "@/lib/domain/dateUtils"
import { splitCents, toCents } from "@/lib/domain/money"
import type { CashFlowItem } from "@/lib/domain/cashFlow"

/**
 * "What would this do to the next months?" — asked without writing anything.
 *
 * The simulated entries live in the page's state and never reach Firestore: the
 * whole point is to try a decision before taking it, and a simulation that leaves
 * traces in the real records would make people afraid to use it.
 */
export function SimulatorDialog({
  onSimulate,
}: {
  onSimulate: (items: CashFlowItem[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(todayDateString())
  const [installments, setInstallments] = useState("1")

  function submit() {
    const reais = Number(amount.replace(",", "."))
    const parts = Math.max(1, Math.min(72, Math.round(Number(installments) || 1)))
    if (!Number.isFinite(reais) || reais <= 0) {
      toast.error("Informe um valor")
      return
    }
    const label = description.trim() || "Compra simulada"
    // Same cent-exact split the real installments use, so the simulation cannot show
    // a total the app itself would never produce.
    const cents = splitCents(toCents(reais), parts)
    const day = Number(date.slice(8, 10))
    const items: CashFlowItem[] = cents.map((value, i) => {
      const month = addMonths(monthOfDate(date), i)
      return {
        id: `sim-${Date.now()}-${i}`,
        date: `${month}-${String(day).padStart(2, "0")}`,
        description: parts > 1 ? `${label} ${i + 1}/${parts}` : label,
        amountCents: value,
        direction: "out",
        kind: "simulado",
      }
    })
    onSimulate(items)
    setOpen(false)
    setDescription("")
    setAmount("")
    setInstallments("1")
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FlaskConical className="size-4" />
        Simular
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simular uma compra</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-muted-foreground text-sm">
              Veja o efeito nos próximos meses. Nada é gravado — a simulação some quando
              você sai da tela.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="sim-desc">Descrição</Label>
              <Input
                id="sim-desc"
                placeholder="Geladeira"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="sim-valor">Valor (R$)</Label>
                <Input
                  id="sim-valor"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sim-parcelas">Parcelas</Label>
                <Input
                  id="sim-parcelas"
                  type="number"
                  min="1"
                  max="72"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sim-data">Primeira parcela</Label>
              <Input
                id="sim-data"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button onClick={submit}>Ver efeito</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
