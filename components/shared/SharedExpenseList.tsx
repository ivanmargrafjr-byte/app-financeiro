import { Amount } from "@/components/home/Amount"
import { formatDateBR } from "@/lib/domain/dateUtils"
import type { SharedExpense, SpaceMember } from "@/lib/domain/sharedSpace"

/**
 * What was spent in the space, with who paid and what each person's share was.
 *
 * The share is shown per person rather than as "dividido igualmente": a split people
 * can read is a split they can dispute, and disputing it is the point of writing it
 * down.
 */
export function SharedExpenseList({
  expenses,
  members,
  currentUid,
  hidden = false,
}: {
  expenses: SharedExpense[]
  members: SpaceMember[]
  currentUid: string
  hidden?: boolean
}) {
  const byUid = new Map(members.map((m) => [m.uid, m]))
  const nameOf = (uid: string) => {
    const member = byUid.get(uid)
    if (uid === currentUid) return "você"
    return member?.name?.trim().split(/\s+/)[0] ?? member?.email.split("@")[0] ?? "alguém"
  }

  if (expenses.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma despesa lançada ainda. O que entrar aqui fica visível para todos do espaço —
        e só isso.
      </p>
    )
  }

  return (
    <ul className="grid gap-2">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="border-border bg-card grid gap-1 rounded-lg border px-3 py-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-medium">{expense.description}</span>
            <Amount cents={expense.amountCents} hidden={hidden} size="sm" className="shrink-0" />
          </div>
          <p className="text-muted-foreground text-xs">
            {formatDateBR(expense.date)} · pago por {nameOf(expense.paidByUid)}
          </p>
          <p className="text-muted-foreground text-xs">
            {Object.entries(expense.splitCentsByUid)
              .map(([uid, cents]) => `${nameOf(uid)} ${(cents / 100).toFixed(2)}`)
              .join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  )
}
