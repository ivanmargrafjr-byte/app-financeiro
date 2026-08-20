import Link from "next/link"
import { ChevronRight, CreditCard, Wallet } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Amount } from "@/components/home/Amount"
import { formatDateBR } from "@/lib/domain/dateUtils"

/**
 * What is in the accounts right now, and — the number that actually answers "can I
 * spend this?" — what is left of it once the open invoices are paid. Showing the
 * balance alone is how a card bill becomes a surprise.
 */
export function BalanceCard({
  balanceCents,
  freeCents,
  hidden,
}: {
  balanceCents: number
  /** Balance minus every open invoice; negative when the cards outrun the accounts. */
  freeCents: number
  hidden: boolean
}) {
  return (
    <Card>
      <CardContent className="grid gap-1">
        <Link
          href="/contas"
          className="text-muted-foreground flex items-center gap-1.5 text-sm hover:underline"
        >
          <Wallet className="size-4" />
          Saldo nas contas
          <ChevronRight className="size-3.5" />
        </Link>
        <Amount cents={balanceCents} hidden={hidden} size="xl" />
        <p className="text-muted-foreground text-sm">
          {freeCents >= 0 ? (
            <>
              <Amount
                cents={freeCents}
                hidden={hidden}
                size="sm"
                approximate
                className="text-emerald-600 dark:text-emerald-400"
              />{" "}
              livres depois de pagar as faturas
            </>
          ) : (
            <>
              faltam{" "}
              <Amount
                cents={Math.abs(freeCents)}
                hidden={hidden}
                size="sm"
                approximate
                className="text-destructive"
              />{" "}
              para cobrir as faturas em aberto
            </>
          )}
        </p>
      </CardContent>
    </Card>
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
