/**
 * A contract as a set of dates that will cost money or attention, rather than a
 * filed document.
 *
 * What makes a contract expensive is rarely the clause itself: it is the promotional
 * price that quietly ends, the renewal that happens because nobody said anything, or
 * the cancellation window that closed last week. Those are dates, and dates can be
 * shown before they pass.
 */

import { addDays, addMonths, monthLabel, monthOfDate, type DateString, type MonthString } from "@/lib/domain/dateUtils"
import type { Contract } from "@/lib/types"

export type ContractEventKind =
  | "inicio"
  | "fim"
  | "aviso-cancelamento"
  | "fim-promocao"
  | "reajuste"

export type ContractEvent = {
  kind: ContractEventKind
  date: DateString
  label: string
  /** What changes in the monthly cost on that date, when the contract says so. */
  deltaCents?: number
  /** Past dates are kept and marked, rather than hidden: a missed window still explains a bill. */
  past: boolean
}

/** Months in a billing period — how many months one charge covers. */
const PERIOD_MONTHS: Record<NonNullable<Contract["billingPeriod"]>, number> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
  unico: 0,
}

/**
 * What the contract costs in a year, at the value in force today.
 *
 * A one-off contract has no annual cost — spreading it over twelve months would
 * invent a recurring expense that does not exist.
 */
export function annualCostCents(contract: Contract): number | null {
  if (contract.valueCents == null) return null
  const months = PERIOD_MONTHS[contract.billingPeriod ?? "mensal"]
  if (months === 0) return null
  return Math.round((contract.valueCents * 12) / months)
}

/** The monthly weight of the contract, for comparing it against a budget. */
export function monthlyCostCents(contract: Contract): number | null {
  const annual = annualCostCents(contract)
  return annual == null ? null : Math.round(annual / 12)
}

function adjustmentDate(contract: Contract, today: DateString): DateString | null {
  if (!contract.adjustmentMonth) return null
  // The month repeats every year; the one that matters is the next occurrence.
  const day = contract.startDate.slice(8, 10)
  const thisYear = `${today.slice(0, 4)}-${contract.adjustmentMonth}-${day}` as DateString
  return thisYear >= today ? thisYear : `${Number(today.slice(0, 4)) + 1}-${contract.adjustmentMonth}-${day}`
}

export function contractEvents(contract: Contract, today: DateString): ContractEvent[] {
  const events: ContractEvent[] = []
  const push = (event: Omit<ContractEvent, "past">) =>
    events.push({ ...event, past: event.date < today })

  push({ kind: "inicio", date: contract.startDate, label: "Início da vigência" })
  push({
    kind: "fim",
    date: contract.endDate,
    label: contract.autoRenew ? "Renovação automática" : "Fim da vigência",
  })

  if (contract.noticeDays != null && contract.noticeDays > 0) {
    push({
      kind: "aviso-cancelamento",
      date: addDays(contract.endDate, -contract.noticeDays),
      label: `Prazo para avisar cancelamento (${contract.noticeDays} dias antes)`,
    })
  }

  if (contract.promoEndsAt) {
    const delta =
      contract.postPromoValueCents != null && contract.valueCents != null
        ? contract.postPromoValueCents - contract.valueCents
        : undefined
    push({
      kind: "fim-promocao",
      date: contract.promoEndsAt,
      label: "Fim do desconto promocional",
      deltaCents: delta,
    })
  }

  const adjustment = adjustmentDate(contract, today)
  if (adjustment) {
    push({
      kind: "reajuste",
      date: adjustment,
      label: contract.adjustmentIndex
        ? `Reajuste previsto (${contract.adjustmentIndex})`
        : "Reajuste previsto",
    })
  }

  return events.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
}

export type ContractAttention = {
  contract: Contract
  event: ContractEvent
  /** Days from today until the event; negative once it has passed. */
  inDays: number
}

function daysBetween(from: DateString, to: DateString): number {
  return Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86_400_000)
}

/**
 * Contracts with something about to happen — the review agenda.
 *
 * Sorted by how soon, not by contract: what matters is what has to be decided this
 * week, and a list ordered by supplier hides exactly that.
 */
export function contractsNeedingAttention(
  contracts: Contract[],
  today: DateString,
  withinDays = 90
): ContractAttention[] {
  const limit = addDays(today, withinDays)
  return contracts
    .filter((contract) => !contract.archived)
    .flatMap((contract) =>
      contractEvents(contract, today)
        .filter((event) => event.kind !== "inicio" && !event.past && event.date <= limit)
        .map((event) => ({ contract, event, inDays: daysBetween(today, event.date) }))
    )
    .sort((a, b) => a.inDays - b.inDays)
}

/** "aumenta R$ 40 por mês a partir de outubro de 2026" — the sentence that makes a date matter. */
export function describeIncrease(event: ContractEvent): string | null {
  if (event.deltaCents == null || event.deltaCents === 0) return null
  const month: MonthString = monthOfDate(event.date)
  const direction = event.deltaCents > 0 ? "aumenta" : "diminui"
  return `${direction} a partir de ${monthLabel(month).toLowerCase()}`
}

/** The month a contract stops costing money, when it is not set to renew itself. */
export function endsInMonth(contract: Contract): MonthString | null {
  return contract.autoRenew ? null : monthOfDate(contract.endDate)
}

export { addMonths }
