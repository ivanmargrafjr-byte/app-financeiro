import { describe, expect, it } from "vitest"

import { buildMonthReview, explainDespesas } from "./monthReview"
import { formatCentsBRL } from "./money"
import type { Category, Transaction } from "@/lib/types"

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    origin: "account",
    direction: "out",
    amountCents: 10000,
    description: "Mercado",
    categoryId: "mercado",
    categoryName: "Mercado",
    categoryColor: "#111",
    categoryIcon: "ShoppingCart",
    date: "2026-09-10",
    competenceMonth: "2026-09",
    createdAt: 0,
    updatedAt: 0,
    settled: true,
    accountId: "a1",
    ...overrides,
  }
}

const categories: Category[] = [
  { id: "mercado", name: "Mercado", type: "despesa", icon: "ShoppingCart", color: "#111", archived: false, isDefault: false, parentId: null },
  { id: "casa", name: "Casa", type: "despesa", icon: "Home", color: "#222", archived: false, isDefault: false, parentId: null },
]

const base = {
  month: "2026-09",
  previousMonth: "2026-08",
  categories,
  archivedCardsById: new Map(),
}

describe("buildMonthReview", () => {
  it("compares income, expenses and what was left", () => {
    const review = buildMonthReview({
      ...base,
      current: [tx({ amountCents: 60000 }), tx({ id: "in", direction: "in", amountCents: 500000 })],
      previous: [tx({ id: "p1", amountCents: 40000 }), tx({ id: "p2", direction: "in", amountCents: 450000 })],
    })

    expect(review.despesas).toEqual({ currentCents: 60000, previousCents: 40000, deltaCents: 20000 })
    expect(review.receitas.deltaCents).toBe(50000)
    expect(review.saldo).toEqual({ currentCents: 440000, previousCents: 410000, deltaCents: 30000 })
  })

  it("names the categories that moved, biggest first", () => {
    const review = buildMonthReview({
      ...base,
      current: [tx({ amountCents: 30000 }), tx({ id: "c", categoryId: "casa", amountCents: 120000 })],
      previous: [tx({ id: "p", amountCents: 25000 }), tx({ id: "pc", categoryId: "casa", amountCents: 20000 })],
    })

    expect(review.byCategory.map((c) => c.name)).toEqual(["Casa", "Mercado"])
    expect(review.byCategory[0].deltaCents).toBe(100000)
  })

  it("leaves out a category that did not move", () => {
    const review = buildMonthReview({
      ...base,
      current: [tx({ amountCents: 30000 })],
      previous: [tx({ id: "p", amountCents: 30000 })],
    })

    expect(review.byCategory).toEqual([])
  })

  it("separates what repeats from what does not", () => {
    const review = buildMonthReview({
      ...base,
      current: [
        tx({ id: "assinatura", recurringSeriesId: "r1", amountCents: 5000 }),
        tx({ id: "parcela", installmentGroupId: "g1", amountCents: 20000 }),
        tx({ id: "geladeira", amountCents: 200000 }),
      ],
      previous: [tx({ id: "assinatura-ant", recurringSeriesId: "r1", amountCents: 5000 })],
    })

    expect(review.recurring).toEqual({ currentCents: 25000, previousCents: 5000, deltaCents: 20000 })
    expect(review.oneOff).toEqual({ currentCents: 200000, previousCents: 0, deltaCents: 200000 })
  })

  it("calls out the one-off expenses big enough to explain the month", () => {
    const review = buildMonthReview({
      ...base,
      current: [
        tx({ id: "geladeira", description: "Geladeira", amountCents: 200000 }),
        tx({ id: "cafe", description: "Café", amountCents: 1000 }),
      ],
      previous: [],
    })

    expect(review.exceptional.map((t) => t.description)).toEqual(["Geladeira"])
  })

  it("does not call an ordinary month for that category exceptional", () => {
    const review = buildMonthReview({
      ...base,
      current: [
        tx({ id: "compras", description: "Mercado", amountCents: 92000 }),
        tx({ id: "geladeira", categoryId: "casa", description: "Geladeira", amountCents: 240000 }),
      ],
      previous: [tx({ id: "p", description: "Mercado", amountCents: 84000 })],
    })

    expect(review.exceptional.map((t) => t.description)).toEqual(["Geladeira"])
  })

  it("does not call a recurring charge exceptional, however large", () => {
    const review = buildMonthReview({
      ...base,
      current: [tx({ id: "aluguel", description: "Aluguel", recurringSeriesId: "r1", amountCents: 250000 })],
      previous: [],
    })

    expect(review.exceptional).toEqual([])
  })

  it("ignores transfers, adjustments and card markers, like every other total", () => {
    const review = buildMonthReview({
      ...base,
      current: [
        tx({ id: "transf", origin: "transfer", amountCents: 90000 }),
        tx({ id: "ajuste", origin: "adjustment", amountCents: 90000 }),
        tx({ id: "pagamento", isInvoicePayment: true, amountCents: 90000 }),
        tx({ id: "real", amountCents: 10000 }),
      ],
      previous: [],
    })

    expect(review.despesas.currentCents).toBe(10000)
  })
})

describe("explainDespesas", () => {
  it("says the month held steady when it did", () => {
    const review = buildMonthReview({
      ...base,
      current: [tx({ amountCents: 100000 })],
      previous: [tx({ id: "p", amountCents: 98000 })],
    })

    expect(explainDespesas(review)).toBe("As despesas ficaram próximas do mês anterior.")
  })

  it("points at the one-off that explains the rise", () => {
    const review = buildMonthReview({
      ...base,
      current: [
        tx({ id: "aluguel", recurringSeriesId: "r1", amountCents: 100000 }),
        tx({ id: "geladeira", description: "Geladeira", amountCents: 200000 }),
      ],
      previous: [tx({ id: "aluguel-ant", recurringSeriesId: "r1", amountCents: 100000 })],
    })

    const sentence = explainDespesas(review)
    expect(sentence).toContain(`${formatCentsBRL(200000)} maiores`)
    expect(sentence).toContain("geladeira")
  })

  it("says so when the rise is in the charges that repeat", () => {
    const review = buildMonthReview({
      ...base,
      current: [tx({ id: "a", recurringSeriesId: "r1", amountCents: 150000 })],
      previous: [tx({ id: "b", recurringSeriesId: "r1", amountCents: 100000 })],
    })

    expect(explainDespesas(review)).toContain("cobranças que se repetem")
  })

  it("does not compare against a month with nothing in it", () => {
    const review = buildMonthReview({ ...base, current: [tx({})], previous: [] })

    expect(explainDespesas(review)).toBe("Não há mês anterior com despesas para comparar.")
  })
})
