"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, CreditCard, Wallet } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Amount } from "@/components/home/Amount"
import { formatDateBR } from "@/lib/domain/dateUtils"
import { cn } from "@/lib/utils"
import type { FreeToSpend } from "@/lib/domain/homeSummary"

/**
 * How much of the money is actually free to spend, and where the rest of it went.
 *
 * The balance alone answers the wrong question — it is the number that turns a card
 * bill into a surprise. What is left after the commitments is the figure someone is
 * really asking for, so it is the one set large; the balance stays underneath as the
 * fact it came from, and the breakdown opens for anyone who wants to check the maths.
 */
export function BalanceCard({
  free,
  hidden,
  reserveAction,
}: {
  free: FreeToSpend
  hidden: boolean
  /** Passed in rather than imported: it talks to Firestore, and this file stays pure. */
  reserveAction?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const throughLabel = formatDateBR(free.throughDate)
  const negative = free.cents < 0

  return (
    <Card>
      <CardContent className="grid gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline"
        >
          <Wallet className="size-4" />
          Livre para gastar até {throughLabel}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <Amount
          cents={free.cents}
          hidden={hidden}
          size="xl"
          className={negative ? "text-destructive" : undefined}
        />
        <Link
          href="/contas"
          className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline"
        >
          de <Amount cents={free.balanceCents} hidden={hidden} size="sm" /> nas contas
          <ChevronRight className="size-3.5" />
        </Link>

        {open && (
          <dl className="bg-muted mt-2 grid gap-1.5 rounded-lg p-3 text-xs">
            <BreakdownRow label="Saldo nas contas" cents={free.balanceCents} hidden={hidden} />
            <BreakdownRow
              label="Contas pendentes"
              cents={-free.committedCents}
              hidden={hidden}
            />
            <BreakdownRow label="Faturas em aberto" cents={-free.invoicesCents} hidden={hidden} />
            {free.goalsCents > 0 && (
              <BreakdownRow label="Guardado em metas" cents={-free.goalsCents} hidden={hidden} />
            )}
            <BreakdownRow
              label="Reservado"
              cents={-free.reservedCents}
              hidden={hidden}
              action={reserveAction}
            />
            <div className="border-border mt-1 border-t pt-1.5">
              <BreakdownRow label="Livre para gastar" cents={free.cents} hidden={hidden} strong />
            </div>
            {free.expectedIncomeCents > 0 && (
              // Kept out of the total on purpose: money that has not landed is a plan.
              <p className="text-muted-foreground border-border mt-1 border-t pt-1.5">
                Fora da conta:{" "}
                <Amount cents={free.expectedIncomeCents} hidden={hidden} size="sm" /> a receber
                até {throughLabel}, ainda não creditados
                {free.uncertainIncomeCents > 0 && (
                  <>
                    {" "}
                    — sendo{" "}
                    <Amount cents={free.uncertainIncomeCents} hidden={hidden} size="sm" /> apenas
                    esperados
                  </>
                )}
                .
              </p>
            )}
            <p className="text-muted-foreground/80">
              Considera apenas o que já está registrado no app.
            </p>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function BreakdownRow({
  label,
  cents,
  hidden,
  strong = false,
  action,
}: {
  label: string
  cents: number
  hidden: boolean
  strong?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className={cn("flex items-center gap-1", strong && "font-medium")}>
        {label}
        {action}
      </dt>
      <dd className={cn("shrink-0", strong && "font-medium")}>
        <Amount cents={cents} hidden={hidden} size="sm" />
      </dd>
    </div>
  )
}

export function OpenInvoicesCard({
  totalCents,
  invoiceCount,
  nextDueDate,
  today,
  hidden,
}: {
  totalCents: number
  invoiceCount: number
  nextDueDate: string | null
  today: string
  hidden: boolean
}) {
  const plural = invoiceCount === 1 ? "fatura" : "faturas"
  // An invoice past its due date reading "vence em 05/08" when today is the 19th
  // looks like a broken screen rather than a late bill.
  const overdue = !!nextDueDate && nextDueDate < today

  return (
    <Card>
      <CardContent className="grid gap-1">
        <Link
          href="/cartoes"
          className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline"
        >
          <CreditCard className="size-4" />
          Faturas em aberto
          <ChevronRight className="size-3.5" />
        </Link>
        <Amount
          cents={totalCents}
          hidden={hidden}
          size="lg"
          approximate={totalCents > 0}
          className={totalCents > 0 ? "text-destructive" : undefined}
        />
        <p className="text-muted-foreground text-sm">
          {invoiceCount === 0
            ? "Nenhuma fatura em aberto"
            : nextDueDate
              ? `${invoiceCount} ${plural} · a próxima ${overdue ? "venceu" : "vence"} em ${formatDateBR(nextDueDate)}`
              : `${invoiceCount} ${plural}`}
        </p>
      </CardContent>
    </Card>
  )
}
