"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useSetReserved } from "@/lib/hooks/useReserve"
import { fromCents, toCents } from "@/lib/domain/money"

/**
 * Sets the amount held back from "livre para gastar".
 *
 * The wording says "no app" on purpose: reserving here allocates money in the
 * planning, it does not move a cent between accounts or into an investment.
 */
export function ReserveDialog({ reservedCents }: { reservedCents: number }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const setReserved = useSetReserved()

  function start() {
    setValue(reservedCents > 0 ? String(fromCents(reservedCents)) : "")
    setOpen(true)
  }

  async function save() {
    const reais = Number(value.replace(",", "."))
    if (!Number.isFinite(reais) || reais < 0) {
      toast.error("Informe um valor válido")
      return
    }
    try {
      await setReserved.mutateAsync(toCents(reais))
      toast.success(reais > 0 ? "Valor reservado" : "Reserva removida")
      setOpen(false)
    } catch {
      toast.error("Não foi possível salvar a reserva")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        aria-label="Ajustar valor reservado"
        className="text-muted-foreground hover:text-foreground"
      >
        <Pencil className="size-3" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valor reservado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-muted-foreground text-sm">
              Quanto você quer manter intocado. O dinheiro continua na conta — ele só deixa
              de contar como livre para gastar.
            </p>
            <Input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              autoFocus
              placeholder="0,00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Button onClick={save} disabled={setReserved.isPending}>
              {setReserved.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
