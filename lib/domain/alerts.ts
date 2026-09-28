/**
 * Warnings the app can justify.
 *
 * Every alert carries the reason it exists and a place to go and check it. That is
 * the difference between a warning and a nag: "você consumiu 80% do orçamento de
 * Mercado e ainda faltam 12 dias" can be argued with, "cuidado com os gastos" cannot.
 *
 * Nothing here accuses. An unusual charge is a reason to look, never a claim that
 * something is wrong — the app cannot know, and a wrong accusation about money costs
 * more trust than a missed warning.
 */

import { formatCentsBRL } from "@/lib/domain/money"
import {
  formatDateBR,
  monthLabel,
  monthOfDate,
  type DateString,
  type MonthString,
} from "@/lib/domain/dateUtils"
import { goalProgress, type Goal } from "@/lib/domain/goals"
import type { BudgetLine } from "@/lib/domain/budget"
import type { CashFlow } from "@/lib/domain/cashFlow"
import type { ContractAttention } from "@/lib/domain/contractLifecycle"
import { withFocus } from "@/lib/navigation/focus"
import type { Transaction } from "@/lib/types"

export type AlertKind = "saldo" | "orcamento" | "meta" | "contrato" | "recorrencia" | "duplicidade"

export type AlertSeverity = "critico" | "atencao"

export type Alert = {
  id: string
  kind: AlertKind
  severity: AlertSeverity
  title: string
  /** Why the app is saying this — shown under the title, never omitted. */
  because: string
  /**
   * Where to go to check it, pointing at the row itself — see withFocus. An alert that
   * lands on the right screen and leaves the person scanning it has only half arrived.
   */
  href: string
  /**
   * The month the destination has to be showing for that row to be there at all. The
   * screens keep whichever month the person last chose, so a link to a September entry
   * opened while browsing July would land on a list that does not contain it.
   */
  month?: MonthString
  date?: DateString
}

export const ALERT_LABELS: Record<AlertKind, string> = {
  saldo: "Saldo",
  orcamento: "Orçamentos",
  meta: "Metas",
  contrato: "Contratos",
  recorrencia: "Cobranças recorrentes",
  duplicidade: "Possíveis duplicidades",
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critico: 0, atencao: 1 }

export function alertsFromCashFlow(flow: CashFlow): Alert[] {
  if (!flow.firstNegative) return []
  return [
    {
      id: `saldo-${flow.firstNegative.date}`,
      kind: "saldo",
      severity: "critico",
      title: `O saldo pode ficar negativo em ${formatDateBR(flow.firstNegative.date)}`,
      because: `Somando o que já está registrado até lá, faltam ${formatCentsBRL(
        Math.abs(flow.firstNegative.cents)
      )}.`,
      href: withFocus("/fluxo", [flow.firstNegative.date]),
      date: flow.firstNegative.date,
    },
  ]
}

export function alertsFromBudgets(lines: BudgetLine[], month: MonthString): Alert[] {
  return lines
    .filter((line) => line.status !== "ok")
    .map((line) => ({
      id: `orcamento-${line.category.id}`,
      kind: "orcamento" as const,
      severity: line.status === "estourado" ? ("critico" as const) : ("atencao" as const),
      title:
        line.status === "estourado"
          ? `${line.category.name} passou do limite`
          : `${line.category.name} está acima do ritmo do mês`,
      because:
        line.status === "estourado"
          ? `Você gastou ${formatCentsBRL(line.spentCents)} de um limite de ${formatCentsBRL(
              line.limitCents
            )}.`
          : `Já foram ${formatCentsBRL(line.spentCents)} dos ${formatCentsBRL(
              line.limitCents
            )} do mês, mais rápido do que o mês está passando.`,
      href: withFocus("/orcamentos", [line.category.id]),
      month,
    }))
}

export function alertsFromGoals(goals: Goal[], today: DateString): Alert[] {
  return goals
    .map((goal) => ({ goal, progress: goalProgress(goal, today) }))
    .filter(({ progress }) => progress.late)
    .map(({ goal, progress }) => ({
      id: `meta-${goal.id}`,
      kind: "meta" as const,
      severity: "atencao" as const,
      title: `${goal.name} passou da data`,
      because: `A data era ${formatDateBR(goal.dueDate)} e ainda faltam ${formatCentsBRL(
        progress.missingCents
      )}.`,
      href: withFocus("/orcamentos", [goal.id]),
      month: monthOfDate(today),
      date: goal.dueDate,
    }))
}

export function alertsFromContracts(attention: ContractAttention[], withinDays = 30): Alert[] {
  return attention
    .filter((item) => item.inDays <= withinDays)
    .map(({ contract, event, inDays }) => ({
      id: `contrato-${contract.id}-${event.kind}`,
      kind: "contrato" as const,
      severity: inDays <= 7 ? ("critico" as const) : ("atencao" as const),
      title: `${contract.contractee}: ${event.label.toLowerCase()}`,
      because:
        event.deltaCents != null && event.deltaCents !== 0
          ? `Em ${formatDateBR(event.date)}. Pelos valores cadastrados, a despesa ${
              event.deltaCents > 0 ? "aumenta" : "diminui"
            } ${formatCentsBRL(Math.abs(event.deltaCents))} por cobrança.`
          : `Em ${formatDateBR(event.date)}, daqui a ${inDays} dias.`,
      href: `/contratos/${contract.id}`,
      date: event.date,
    }))
}

/**
 * Where an entry can actually be seen.
 *
 * A card purchase is not on /transacoes: that list leaves them out on purpose, because
 * the fatura above it already shows them consolidated. An alert that linked there was
 * pointing at a row the screen would never render — it looked like the highlight was
 * broken, when the entry simply was not there.
 *
 * The month is the entry's competência, which is what /transacoes is scoped by. For a
 * card purchase that is the invoice's month, not the month it was bought in — which is
 * also why these alerts carry dates from weeks ago and are right to.
 */
function transactionTarget(
  t: Transaction,
  ids: string[]
): { href: string; month?: MonthString } {
  if (t.origin === "card" && t.cardId && t.invoiceId) {
    return { href: withFocus(`/cartoes/${t.cardId}/faturas/${t.invoiceId}`, ids) }
  }
  return { href: withFocus("/transacoes", ids), month: t.competenceMonth }
}

/** Charges above a twentieth of the previous cycle — below that it is rounding, not a rise. */
const RECURRING_TOLERANCE = 0.05

/**
 * Recurring charges that came in higher than last cycle.
 *
 * Says "confira se houve reajuste", not "cobrança indevida": the app knows the two
 * amounts and nothing about the reason.
 */
export function alertsFromRecurring(
  currentMonth: Transaction[],
  previousMonth: Transaction[],
  month: string
): Alert[] {
  const previousBySeries = new Map<string, Transaction>()
  for (const t of previousMonth) {
    if (t.recurringSeriesId) previousBySeries.set(t.recurringSeriesId, t)
  }

  return currentMonth.flatMap((t) => {
    if (!t.recurringSeriesId || t.direction !== "out") return []
    const previous = previousBySeries.get(t.recurringSeriesId)
    if (!previous || previous.amountCents <= 0) return []
    if (t.amountCents <= previous.amountCents * (1 + RECURRING_TOLERANCE)) return []
    return [
      {
        id: `recorrencia-${t.id}`,
        kind: "recorrencia" as const,
        severity: "atencao" as const,
        title: `${t.description} veio maior este mês`,
        because: `Era ${formatCentsBRL(previous.amountCents)} e veio ${formatCentsBRL(
          t.amountCents
        )} em ${monthLabel(month).toLowerCase()}. Confira se houve reajuste.`,
        ...transactionTarget(t, [t.id]),
        date: t.date,
      },
    ]
  })
}

/** Same wording once case and stray spaces are set aside — "Padaria" and "padaria " match. */
function sameDescriptionKey(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Entries that look like the same expense entered twice.
 *
 * Only ever offered for review. Two identical charges on the same day are perfectly
 * possible — two coffees, two fares — so the app points and asks rather than deciding.
 *
 * The description is part of what makes two entries look alike. Without it, an imported
 * fatura — where a whole statement can land under one category — turned every pair of
 * same-day purchases of the same value into an alert: a padaria and a farmácia, both
 * R$ 45 on the 12th, are not a duplicate of anything. It also made the alert's own text
 * a small lie, since it quoted the first entry's description as if the group shared it.
 */
export function alertsFromDuplicates(
  transactions: Transaction[],
  cardNameById: ReadonlyMap<string, string> = new Map()
): Alert[] {
  const seen = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (t.direction !== "out" || t.installmentGroupId || t.origin === "transfer") continue
    const key = `${t.date}|${t.amountCents}|${t.categoryId}|${sameDescriptionKey(t.description)}`
    const list = seen.get(key)
    if (list) list.push(t)
    else seen.set(key, [t])
  }

  return [...seen.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const cardName = group[0].cardId ? cardNameById.get(group[0].cardId) : undefined
      // Named because these dates surprise: a purchase sits in the month its fatura
      // falls due, so a September alert can be about the 28th of August and be right.
      const where = cardName ? `, na fatura do ${cardName}` : ""
      return {
        id: `duplicidade-${group[0].id}`,
        kind: "duplicidade" as const,
        severity: "atencao" as const,
        title: `${group.length} lançamentos iguais em ${formatDateBR(group[0].date)}`,
        because: `${group[0].description} · ${formatCentsBRL(
          group[0].amountCents
        )}, na mesma categoria e no mesmo dia${where}. Pode ser duplicidade — ou não, e aí basta ignorar.`,
        ...transactionTarget(
          group[0],
          group.map((t) => t.id)
        ),
        date: group[0].date,
      }
    })
}

/** Most urgent first, and within the same urgency, the soonest date. */
export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (bySeverity !== 0) return bySeverity
    if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    return a.date ? -1 : b.date ? 1 : 0
  })
}
