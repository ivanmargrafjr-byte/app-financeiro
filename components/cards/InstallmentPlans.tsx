import { Amount } from "@/components/home/Amount"
import { monthLabel } from "@/lib/domain/dateUtils"
import type { InstallmentPlan } from "@/lib/domain/cardCommitment"

/**
 * The instalments still running, in the order they stop costing money.
 *
 * "Termina em" is the point: a parcel that ends next month is money coming back,
 * and knowing when is what makes a commitment feel finite.
 */
export function InstallmentPlans({
  plans,
  cardNameById,
  hidden = false,
}: {
  plans: InstallmentPlan[]
  cardNameById: Map<string, string>
  hidden?: boolean
}) {
  if (plans.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma compra parcelada em andamento.</p>
  }

  return (
    <ul className="grid gap-2">
      {plans.map((plan) => (
        <li
          key={plan.groupId}
          className="border-border bg-card flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{plan.description}</p>
            <p className="text-muted-foreground truncate text-xs">
              {cardNameById.get(plan.cardId) ?? "Cartão"} · restam {plan.remainingParcels} de{" "}
              {plan.totalParcels} · termina em {monthLabel(plan.lastMonth).toLowerCase()}
            </p>
          </div>
          <Amount cents={plan.remainingCents} hidden={hidden} size="sm" className="shrink-0" />
        </li>
      ))}
    </ul>
  )
}
