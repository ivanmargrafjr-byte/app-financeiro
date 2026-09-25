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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { todayDateString } from "@/lib/domain/dateUtils"
import { toCents } from "@/lib/domain/money"
import { splitByWeight, splitEqually, type SpaceMember } from "@/lib/domain/sharedSpace"

/**
 * A shared expense: what it cost, who paid, and how it is divided.
 *
 * Proportional shares are entered as weights ("2" and "1") rather than percentages,
 * because that is how people say it — "ele ganha o dobro" — and because weights
 * cannot add up to 97%.
 */
export function SharedExpenseDialog({
  members,
  currentUid,
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  members: SpaceMember[]
  currentUid: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (expense: {
    description: string
    amountCents: number
    date: string
    paidByUid: string
    splitCentsByUid: Record<string, number>
  }) => Promise<void>
  submitting?: boolean
}) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(todayDateString())
  const [paidByUid, setPaidByUid] = useState(currentUid)
  const [mode, setMode] = useState<"igual" | "peso">("igual")
  const [weights, setWeights] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.uid, "1"]))
  )

  const nameOf = (member: SpaceMember) =>
    member.name?.trim().split(/\s+/)[0] ?? member.email.split("@")[0]

  async function submit() {
    const reais = Number(amount.replace(",", "."))
    if (!description.trim()) {
      toast.error("Informe a descrição")
      return
    }
    if (!Number.isFinite(reais) || reais <= 0) {
      toast.error("Informe um valor maior que zero")
      return
    }
    const cents = toCents(reais)
    const uids = members.map((m) => m.uid)
    const splitCentsByUid =
      mode === "igual"
        ? splitEqually(cents, uids)
        : splitByWeight(
            cents,
            Object.fromEntries(uids.map((uid) => [uid, Number(weights[uid]) || 0]))
          )

    try {
      await onSubmit({
        description: description.trim(),
        amountCents: cents,
        date,
        paidByUid,
        splitCentsByUid,
      })
      onOpenChange(false)
      setDescription("")
      setAmount("")
    } catch {
      toast.error("Não foi possível salvar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova despesa compartilhada</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="desp-desc">Descrição</Label>
            <Input
              id="desp-desc"
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mercado"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="desp-valor">Valor (R$)</Label>
              <Input
                id="desp-valor"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desp-data">Data</Label>
              <Input
                id="desp-data"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Quem pagou</Label>
            <Select value={paidByUid} onValueChange={(value) => setPaidByUid(value ?? currentUid)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => {
                    const member = members.find((m) => m.uid === value)
                    return member ? nameOf(member) : "Selecione"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.uid} value={member.uid}>
                    {nameOf(member)}
                    {member.uid === currentUid ? " (você)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Como dividir</Label>
            <Select
              value={mode}
              onValueChange={(value) => setMode((value as "igual" | "peso" | null) ?? "igual")}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => (value === "peso" ? "Proporcional" : "Igualmente")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="igual">Igualmente</SelectItem>
                <SelectItem value="peso">Proporcional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "peso" && (
            <div className="grid gap-2">
              <p className="text-muted-foreground text-xs">
                Pesos, não porcentagem: 2 e 1 significa que a primeira pessoa paga o dobro.
              </p>
              {members.map((member) => (
                <div key={member.uid} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`peso-${member.uid}`} className="font-normal">
                    {nameOf(member)}
                  </Label>
                  <Input
                    id={`peso-${member.uid}`}
                    type="number"
                    min="0"
                    step="1"
                    className="w-24"
                    value={weights[member.uid] ?? "1"}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [member.uid]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          )}
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar despesa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
