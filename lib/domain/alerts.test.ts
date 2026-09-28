import { describe, expect, it } from "vitest"

import {
  alertsFromBudgets,
  alertsFromCashFlow,
  alertsFromContracts,
  alertsFromDuplicates,
  alertsFromGoals,
  alertsFromRecurring,
  sortAlerts,
} from "./alerts"
import { buildCashFlow } from "./cashFlow"
import type { BudgetLine } from "./budget"
import type { Goal } from "./goals"
import type { ContractAttention } from "./contractLifecycle"
import { formatCentsBRL } from "./money"
import type { Category, Contract, Transaction } from "@/lib/types"

const TODAY = "2026-09-24"

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    origin: "account",
    direction: "out",
    amountCents: 10000,
    description: "Internet",
    categoryId: "casa",
    categoryName: "Casa",
    categoryColor: "#111",
    categoryIcon: "Home",
    date: "2026-09-10",
    competenceMonth: "2026-09",
    createdAt: 0,
    updatedAt: 0,
    settled: true,
    accountId: "a1",
    ...overrides,
  }
}

const category: Category = {
  id: "mercado",
  name: "Mercado",
  type: "despesa",
  icon: "ShoppingCart",
  color: "#111",
  archived: false,
  isDefault: false,
  parentId: null,
}

function line(overrides: Partial<BudgetLine>): BudgetLine {
  return {
    category,
    limitCents: 80000,
    spentCents: 60000,
    remainingCents: 20000,
    usedRatio: 0.75,
    status: "atencao",
    ...overrides,
  }
}

describe("alertsFromCashFlow", () => {
  it("says when the money runs out and how much is missing", () => {
    const flow = buildCashFlow({
      today: TODAY,
      days: 30,
      balanceCents: 10000,
      transactions: [tx({ id: "aluguel", date: "2026-09-28", amountCents: 50000, settled: false })],
      openInvoices: [],
      cardsById: new Map(),
    })
    const [alert] = alertsFromCashFlow(flow)

    expect(alert.severity).toBe("critico")
    expect(alert.title).toContain("28/09/2026")
    // Intl pt-BR puts a non-breaking space after "R$", so the expected text is built
    // the same way the alert builds it.
    expect(alert.because).toContain(formatCentsBRL(40000))
    // Points at the day itself, so /fluxo opens with that day ringed.
    expect(alert.href).toBe("/fluxo?foco=2026-09-28")
  })

  it("says nothing when the balance holds", () => {
    const flow = buildCashFlow({
      today: TODAY,
      days: 30,
      balanceCents: 500000,
      transactions: [],
      openInvoices: [],
      cardsById: new Map(),
    })

    expect(alertsFromCashFlow(flow)).toEqual([])
  })
})

describe("alertsFromBudgets", () => {
  it("separates being over the limit from being ahead of the month", () => {
    const alerts = alertsFromBudgets(
      [
        line({ status: "estourado", spentCents: 95000 }),
        line({ category: { ...category, id: "lazer", name: "Lazer" }, status: "atencao" }),
        line({ category: { ...category, id: "casa", name: "Casa" }, status: "ok" }),
      ],
      "2026-09"
    )

    expect(alerts).toHaveLength(2)
    expect(alerts[0].severity).toBe("critico")
    expect(alerts[0].title).toContain("passou do limite")
    expect(alerts[1].title).toContain("acima do ritmo")
  })

  it("points at the category whose limit it is talking about, in the month it read", () => {
    const [alert] = alertsFromBudgets([line({ status: "estourado" })], "2026-09")

    expect(alert.href).toBe(`/orcamentos?foco=${category.id}`)
    expect(alert.month).toBe("2026-09")
  })
})

describe("alertsFromGoals", () => {
  const goal: Goal = {
    id: "g1",
    kind: "anual",
    name: "IPVA",
    targetCents: 120000,
    dueDate: "2026-09-10",
    savedCents: 20000,
    icon: "CalendarClock",
    color: "#b45309",
    createdAt: 0,
  }

  it("flags a goal whose date passed with money missing", () => {
    const [alert] = alertsFromGoals([goal], TODAY)

    expect(alert.title).toBe("IPVA passou da data")
    expect(alert.because).toContain(formatCentsBRL(100000))
  })

  it("says nothing about one that was reached", () => {
    expect(alertsFromGoals([{ ...goal, savedCents: 120000 }], TODAY)).toEqual([])
  })

  it("points at the goal, on the month being read rather than the one it was due", () => {
    const [alert] = alertsFromGoals([goal], TODAY)

    expect(alert.href).toBe("/orcamentos?foco=g1")
    expect(alert.month).toBe("2026-09")
  })
})

describe("alertsFromContracts", () => {
  const contract = { id: "c1", contractee: "Vivo" } as Contract

  it("treats the next week as critical and says what it costs", () => {
    const attention: ContractAttention[] = [
      {
        contract,
        event: {
          kind: "fim-promocao",
          date: "2026-09-28",
          label: "Fim do desconto promocional",
          deltaCents: 4000,
          past: false,
        },
        inDays: 4,
      },
    ]
    const [alert] = alertsFromContracts(attention)

    expect(alert.severity).toBe("critico")
    expect(alert.because).toContain(`aumenta ${formatCentsBRL(4000)}`)
    expect(alert.href).toBe("/contratos/c1")
  })

  it("leaves out what is still far away", () => {
    const attention: ContractAttention[] = [
      {
        contract,
        event: { kind: "fim", date: "2027-01-10", label: "Fim da vigência", past: false },
        inDays: 108,
      },
    ]

    expect(alertsFromContracts(attention)).toEqual([])
  })
})

describe("alertsFromRecurring", () => {
  it("points at a charge that came in higher, without calling it wrong", () => {
    const [alert] = alertsFromRecurring(
      [tx({ id: "atual", recurringSeriesId: "r1", amountCents: 13000 })],
      [tx({ id: "anterior", recurringSeriesId: "r1", amountCents: 10000 })],
      "2026-09"
    )

    expect(alert.title).toBe("Internet veio maior este mês")
    expect(alert.because).toContain("Confira se houve reajuste")
    // The entry itself, in the month it was read: /transacoes keeps whichever month the
    // person last chose, and this one lives in September.
    expect(alert.href).toBe("/transacoes?foco=atual")
    expect(alert.month).toBe("2026-09")
  })

  it("ignores a difference small enough to be rounding", () => {
    const alerts = alertsFromRecurring(
      [tx({ id: "atual", recurringSeriesId: "r1", amountCents: 10200 })],
      [tx({ id: "anterior", recurringSeriesId: "r1", amountCents: 10000 })],
      "2026-09"
    )

    expect(alerts).toEqual([])
  })

  it("ignores a charge that went down", () => {
    const alerts = alertsFromRecurring(
      [tx({ id: "atual", recurringSeriesId: "r1", amountCents: 8000 })],
      [tx({ id: "anterior", recurringSeriesId: "r1", amountCents: 10000 })],
      "2026-09"
    )

    expect(alerts).toEqual([])
  })
})

describe("alertsFromDuplicates", () => {
  it("offers two identical entries for review", () => {
    const [alert] = alertsFromDuplicates([
      tx({ id: "a", amountCents: 4500, description: "Padaria" }),
      tx({ id: "b", amountCents: 4500, description: "Padaria" }),
    ])

    expect(alert.title).toContain("2 lançamentos iguais")
    expect(alert.because).toContain("ou não, e aí basta ignorar")
  })

  it("points at every entry of the group, not only the first", () => {
    const [alert] = alertsFromDuplicates([
      tx({ id: "a", date: "2026-09-12", amountCents: 4500 }),
      tx({ id: "b", date: "2026-09-12", amountCents: 4500 }),
    ])

    expect(alert.href).toBe("/transacoes?foco=a&foco=b")
    expect(alert.month).toBe("2026-09")
  })

  it("does not flag instalments of the same purchase", () => {
    const alerts = alertsFromDuplicates([
      tx({ id: "a", installmentGroupId: "g1" }),
      tx({ id: "b", installmentGroupId: "g1" }),
    ])

    expect(alerts).toEqual([])
  })

  it("does not flag two different categories on the same day", () => {
    const alerts = alertsFromDuplicates([
      tx({ id: "a", categoryId: "casa" }),
      tx({ id: "b", categoryId: "lazer" }),
    ])

    expect(alerts).toEqual([])
  })
})

describe("sortAlerts", () => {
  it("puts the critical ones first, then the soonest", () => {
    const sorted = sortAlerts([
      { id: "1", kind: "meta", severity: "atencao", title: "", because: "", href: "", date: "2026-09-30" },
      { id: "2", kind: "saldo", severity: "critico", title: "", because: "", href: "", date: "2026-10-05" },
      { id: "3", kind: "orcamento", severity: "atencao", title: "", because: "", href: "", date: "2026-09-26" },
    ])

    expect(sorted.map((a) => a.id)).toEqual(["2", "3", "1"])
  })
})
