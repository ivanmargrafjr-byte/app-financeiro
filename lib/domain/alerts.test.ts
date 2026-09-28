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
import type { Card, Category, Contract, Transaction } from "@/lib/types"

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

/** The two builders below read a month of entries; both need the card cutoff. */
function recurring(
  currentMonth: Transaction[],
  previousMonth: Transaction[],
  archivedCardsById: Map<string, Card> = new Map()
) {
  return alertsFromRecurring({ currentMonth, previousMonth, month: "2026-09", archivedCardsById })
}

function duplicates(
  transactions: Transaction[],
  options: {
    cardNameById?: Map<string, string>
    archivedCardsById?: Map<string, Card>
  } = {}
) {
  return alertsFromDuplicates({
    transactions,
    archivedCardsById: options.archivedCardsById ?? new Map(),
    cardNameById: options.cardNameById,
  })
}

describe("alertsFromRecurring", () => {
  it("points at a charge that came in higher, without calling it wrong", () => {
    const [alert] = recurring(
      [tx({ id: "atual", recurringSeriesId: "r1", amountCents: 13000 })],
      [tx({ id: "anterior", recurringSeriesId: "r1", amountCents: 10000 })]
    )

    expect(alert.title).toBe("Internet veio maior este mês")
    expect(alert.because).toContain("Confira se houve reajuste")
    // The entry itself, in the month it was read: /transacoes keeps whichever month the
    // person last chose, and this one lives in September.
    expect(alert.href).toBe("/transacoes?foco=atual")
    expect(alert.month).toBe("2026-09")
  })

  it("sends a recurring charge on a card to its fatura", () => {
    const [alert] = recurring(
      [
        tx({
          id: "atual",
          origin: "card",
          cardId: "card1",
          invoiceId: "inv1",
          recurringSeriesId: "r1",
          amountCents: 13000,
        }),
      ],
      [tx({ id: "anterior", recurringSeriesId: "r1", amountCents: 10000 })]
    )

    expect(alert.href).toBe("/cartoes/card1/faturas/inv1?foco=atual")
  })

  it("ignores a replaced card's stale copy of the same charge", () => {
    const antigo: Card = {
      id: "antigo",
      name: "Cartão antigo",
      archived: true,
      archivedFromMonth: "2026-09",
    } as Card

    const alerts = recurring(
      [
        tx({
          id: "velho",
          origin: "card",
          cardId: "antigo",
          invoiceId: "inv-antiga",
          recurringSeriesId: "r1",
          amountCents: 13000,
        }),
      ],
      [tx({ id: "anterior", recurringSeriesId: "r1", amountCents: 10000 })],
      new Map([["antigo", antigo]])
    )

    expect(alerts).toEqual([])
  })

  it("ignores a difference small enough to be rounding", () => {
    const alerts = recurring(
      [tx({ id: "atual", recurringSeriesId: "r1", amountCents: 10200 })],
      [tx({ id: "anterior", recurringSeriesId: "r1", amountCents: 10000 })]
    )

    expect(alerts).toEqual([])
  })

  it("ignores a charge that went down", () => {
    const alerts = recurring(
      [tx({ id: "atual", recurringSeriesId: "r1", amountCents: 8000 })],
      [tx({ id: "anterior", recurringSeriesId: "r1", amountCents: 10000 })]
    )

    expect(alerts).toEqual([])
  })
})

describe("alertsFromDuplicates", () => {
  it("offers two identical entries for review", () => {
    const [alert] = duplicates([
      tx({ id: "a", amountCents: 4500, description: "Padaria" }),
      tx({ id: "b", amountCents: 4500, description: "Padaria" }),
    ])

    expect(alert.title).toContain("2 lançamentos iguais")
    expect(alert.because).toContain("ou não, e aí basta ignorar")
  })

  it("points at every entry of the group, not only the first", () => {
    const [alert] = duplicates([
      tx({ id: "a", date: "2026-09-12", amountCents: 4500 }),
      tx({ id: "b", date: "2026-09-12", amountCents: 4500 }),
    ])

    expect(alert.href).toBe("/transacoes?foco=a&foco=b")
    expect(alert.month).toBe("2026-09")
  })

  it("does not flag two different purchases that happen to cost the same", () => {
    // What an imported fatura looks like: one category for the whole statement. Without
    // the description in the key, every same-day pair of equal values became an alert.
    const alerts = duplicates([
      tx({ id: "a", description: "Padaria", amountCents: 4500, categoryId: "outros" }),
      tx({ id: "b", description: "Farmácia", amountCents: 4500, categoryId: "outros" }),
    ])

    expect(alerts).toEqual([])
  })

  it("still flags the same purchase entered twice, however it was typed", () => {
    const alerts = duplicates([
      tx({ id: "a", description: "Padaria" }),
      tx({ id: "b", description: " padaria " }),
    ])

    expect(alerts).toHaveLength(1)
  })

  it("sends a card purchase to its fatura, the only screen that shows it", () => {
    const [alert] = duplicates(
      [
        tx({ id: "a", origin: "card", cardId: "card1", invoiceId: "inv1" }),
        tx({ id: "b", origin: "card", cardId: "card1", invoiceId: "inv1" }),
      ],
      { cardNameById: new Map([["card1", "Nubank"]]) }
    )

    expect(alert.href).toBe("/cartoes/card1/faturas/inv1?foco=a&foco=b")
    // No month: the fatura screen is not scoped by the month switcher.
    expect(alert.month).toBeUndefined()
    expect(alert.because).toContain("na fatura do Nubank")
  })

  it("does not pair a replaced card's stale copy with the live one", () => {
    // The pair that made every alert unverifiable: from its cutoff month on, the old
    // card's entries are a copy of what the new card carries, so opening either fatura
    // showed a single entry and no duplicate to compare it with.
    const antigo: Card = {
      id: "antigo",
      name: "Cartão antigo",
      archived: true,
      archivedFromMonth: "2026-09",
    } as Card

    const alerts = duplicates(
      [
        tx({ id: "velho", origin: "card", cardId: "antigo", invoiceId: "inv-antiga" }),
        tx({ id: "novo", origin: "card", cardId: "novo", invoiceId: "inv-nova" }),
      ],
      { archivedCardsById: new Map([["antigo", antigo]]) }
    )

    expect(alerts).toEqual([])
  })

  it("keeps the old card's own months, which exist nowhere else", () => {
    const antigo: Card = {
      id: "antigo",
      name: "Cartão antigo",
      archived: true,
      archivedFromMonth: "2026-10",
    } as Card

    const alerts = duplicates(
      [
        tx({ id: "a", origin: "card", cardId: "antigo", invoiceId: "inv1" }),
        tx({ id: "b", origin: "card", cardId: "antigo", invoiceId: "inv1" }),
      ],
      { archivedCardsById: new Map([["antigo", antigo]]) }
    )

    expect(alerts).toHaveLength(1)
  })

  it("does not pair an entry paid with a card against the charge it created", () => {
    // Settling with a card copies description, category and amount onto the fatura and
    // leaves the original in place as a checked marker. A perfect match, by design.
    const alerts = duplicates([
      tx({ id: "marcador", settledVia: "card" }),
      tx({ id: "compra", origin: "card", cardId: "card1", invoiceId: "inv1" }),
    ])

    expect(alerts).toEqual([])
  })

  it("does not pair entries sitting on two different faturas", () => {
    // The alert links to one screen; a pair split across two faturas cannot be checked
    // there, which is what "não trazem nenhum outro valor parecido" looked like.
    const alerts = duplicates([
      tx({ id: "a", origin: "card", cardId: "card1", invoiceId: "inv1" }),
      tx({ id: "b", origin: "card", cardId: "card2", invoiceId: "inv2" }),
    ])

    expect(alerts).toEqual([])
  })

  it("does not pair a card purchase with an account entry that looks like it", () => {
    const alerts = duplicates([
      tx({ id: "conta" }),
      tx({ id: "cartao", origin: "card", cardId: "card1", invoiceId: "inv1" }),
    ])

    expect(alerts).toEqual([])
  })

  it("uses the entry's competência for the month, not the date it happened", () => {
    // A card purchase sits in the month its fatura falls due; an account entry can be
    // moved the same way. /transacoes is scoped by competência, so that is what to open.
    const [alert] = duplicates([
      tx({ id: "a", date: "2026-08-28", competenceMonth: "2026-09" }),
      tx({ id: "b", date: "2026-08-28", competenceMonth: "2026-09" }),
    ])

    expect(alert.month).toBe("2026-09")
  })

  it("does not flag instalments of the same purchase", () => {
    const alerts = duplicates([
      tx({ id: "a", installmentGroupId: "g1" }),
      tx({ id: "b", installmentGroupId: "g1" }),
    ])

    expect(alerts).toEqual([])
  })

  it("does not flag two different categories on the same day", () => {
    const alerts = duplicates([
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
