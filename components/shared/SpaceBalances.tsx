import { ArrowRight } from "lucide-react"

import { Amount } from "@/components/home/Amount"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Balance, SpaceMember, Transfer } from "@/lib/domain/sharedSpace"

function shortName(member: SpaceMember | undefined, fallback: string): string {
  if (!member) return fallback
  return member.name?.trim().split(/\s+/)[0] ?? member.email.split("@")[0]
}

/**
 * Who is up and who is down, and the smallest set of payments that ends it.
 *
 * The balance alone starts arguments ("mas eu paguei o mercado"); the suggested
 * transfers end them, because they say what to do rather than who is right.
 */
export function SpaceBalances({
  balances,
  transfers,
  members,
  currentUid,
  onSettle,
  hidden = false,
}: {
  balances: Balance[]
  transfers: Transfer[]
  members: SpaceMember[]
  currentUid: string
  onSettle?: (transfer: Transfer) => void
  hidden?: boolean
}) {
  const byUid = new Map(members.map((m) => [m.uid, m]))

  return (
    <div className="grid gap-3">
      <ul className="grid gap-1.5">
        {balances.map((balance) => {
          const isMe = balance.uid === currentUid
          return (
            <li key={balance.uid} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                {shortName(byUid.get(balance.uid), "Participante")}
                {isMe && <span className="text-muted-foreground"> (você)</span>}
              </span>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 text-xs",
                  balance.cents > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : balance.cents < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                )}
              >
                {balance.cents === 0 ? (
                  "em dia"
                ) : (
                  <>
                    <Amount cents={Math.abs(balance.cents)} hidden={hidden} size="sm" />
                    {balance.cents > 0 ? "a receber" : "a pagar"}
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      {transfers.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-muted-foreground text-xs">Para acertar tudo:</p>
          {transfers.map((transfer) => (
            <div
              key={`${transfer.fromUid}-${transfer.toUid}`}
              className="bg-muted flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{shortName(byUid.get(transfer.fromUid), "Alguém")}</span>
                <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                <span className="truncate">{shortName(byUid.get(transfer.toUid), "Alguém")}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Amount cents={transfer.cents} hidden={hidden} size="sm" />
                {onSettle && (
                  <Button size="sm" variant="outline" onClick={() => onSettle(transfer)}>
                    Registrar
                  </Button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
