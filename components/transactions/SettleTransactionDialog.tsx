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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccounts } from "@/lib/hooks/useAccounts"
import { useCards } from "@/lib/hooks/useCards"
import { useSettleTransaction } from "@/lib/hooks/useTransactions"
import { useSettleTransactionViaCard } from "@/lib/hooks/useInvoices"
import { monthLabel } from "@/lib/domain/dateUtils"
import type { Transaction } from "@/lib/types"

export function SettleTransactionDialog({
  tx,
  open,
  onOpenChange,
}: {
  tx: Transaction
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const settleViaAccount = useSettleTransaction()
  const settleViaCard = useSettleTransactionViaCard()

  const [method, setMethod] = useState<"account" | "card">("account")
  const [accountId, setAccountId] = useState(tx.accountId ?? "")
  const [cardId, setCardId] = useState("")
  const [installmentTotal, setInstallmentTotal] = useState(1)

  const submitting = settleViaAccount.isPending || settleViaCard.isPending
  const canPayWithCard = tx.direction === "out"

  async function handleConfirm() {
    try {
      if (method === "account") {
        if (!accountId) {
          toast.error("Selecione uma conta")
          return
        }
        await settleViaAccount.mutateAsync({ id: tx.id, accountId })
        toast.success("Lançamento efetivado")
      } else {
        const card = cards?.find((c) => c.id === cardId)
        if (!card) {
          toast.error("Selecione um cartão")
          return
        }
        const { competenceMonths } = await settleViaCard.mutateAsync({
          transactionId: tx.id,
          card,
          installmentTotal,
        })

        // The original entry stays put (checked) — only the resulting invoice
        // charge(s) live in the due month, so just let the user know where.
        const firstMonth = competenceMonths[0]
        toast.success(
          installmentTotal > 1
            ? `Lançamento efetivado — parcelas na fatura a partir de ${monthLabel(firstMonth)}`
            : `Lançamento efetivado — foi para a fatura de ${monthLabel(firstMonth)}`
        )
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível efetivar o lançamento")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Efetivar lançamento</DialogTitle>
        </DialogHeader>

        {canPayWithCard ? (
          <Tabs value={method} onValueChange={(v) => setMethod(v as "account" | "card")}>
            <TabsList className="w-full">
              <TabsTrigger value="account">Conta</TabsTrigger>
              <TabsTrigger value="card">Cartão de crédito</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="grid gap-4 pt-4">
              <AccountField
                accountId={accountId}
                setAccountId={setAccountId}
                accounts={accounts}
              />
            </TabsContent>
            <TabsContent value="card" className="grid gap-4 pt-4">
              <CardFields
                cardId={cardId}
                setCardId={setCardId}
                installmentTotal={installmentTotal}
                setInstallmentTotal={setInstallmentTotal}
                cards={cards}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid gap-4">
            <AccountField accountId={accountId} setAccountId={setAccountId} accounts={accounts} />
          </div>
        )}

        <Button onClick={handleConfirm} disabled={submitting} className="mt-2">
          {submitting ? "Efetivando..." : "Efetivar"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function AccountField({
  accountId,
  setAccountId,
  accounts,
}: {
  accountId: string
  setAccountId: (id: string) => void
  accounts: ReturnType<typeof useAccounts>["data"]
}) {
  return (
    <div className="grid gap-2">
      <Label>Conta</Label>
      <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione a conta">
            {(value: string) => accounts?.find((a) => a.id === value)?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {accounts?.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function CardFields({
  cardId,
  setCardId,
  installmentTotal,
  setInstallmentTotal,
  cards,
}: {
  cardId: string
  setCardId: (id: string) => void
  installmentTotal: number
  setInstallmentTotal: (n: number) => void
  cards: ReturnType<typeof useCards>["data"]
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label>Cartão</Label>
        <Select value={cardId} onValueChange={(v) => setCardId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o cartão">
              {(value: string) => cards?.find((c) => c.id === value)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {cards?.map((card) => (
              <SelectItem key={card.id} value={card.id}>
                {card.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Parcelas</Label>
        <Input
          type="number"
          min={1}
          max={48}
          value={installmentTotal}
          onChange={(e) => setInstallmentTotal(Number(e.target.value) || 1)}
        />
      </div>
    </>
  )
}
