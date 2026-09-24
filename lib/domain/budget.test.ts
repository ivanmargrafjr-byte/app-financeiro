import { describe, expect, it } from "vitest"

import { buildBudgetLines, elapsedRatio, sumBudgets } from "./budget"
import type { Category, Transaction } from "@/lib/types"

const MONTH = "2026-09"

function category(overrides: Partial<Category>): Category {
  return {
    id: "mercado",
    name: "Mercado",
    type: "despesa",
    icon: "ShoppingCart",
    color: "#111",
    archived: false,
    isDefault: false,
    parentId: null,
    ...overrides,
  }
}

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    origin: "account",
    direction: "out",
    amountCents: 10000,
    description: "Compra",
    categoryId: "mercado",
    categoryName: "Mercado",
    categoryColor: "#111",
    categoryIcon: "ShoppingCart",
    date: "2026-09-05",
    competenceMonth: MONTH,
    createdAt: 0,
    updatedAt: 0,
    settled: true,
    accountId: "a1",
    ...overrides,
  }
}

const base = {
  categories: [category({})],
  archivedCardsById: new Map(),
  month: MONTH,
  today: "2026-09-15",
}

describe("elapsedRatio", () => {
  it("is half way through the middle of the month", () => {
    expect(elapsedRatio("2026-09", "2026-09-15")).toBeCloseTo(0.5, 2)
  })

  it("is finished for a month already past, and untouched for one ahead", () => {
    expect(elapsedRatio("2026-08", "2026-09-15")).toBe(1)
    expect(elapsedRatio("2026-10", "2026-09-15")).toBe(0)
  })
})

describe("buildBudgetLines", () => {
  it("reports what was spent against the limit", () => {
    const [line] = buildBudgetLines({
      ...base,
      budgets: [{ categoryId: "mercado", limitCents: 80000 }],
      transactions: [tx({ amountCents: 30000 })],
    })

    expect(line.spentCents).toBe(30000)
    expect(line.remainingCents).toBe(50000)
    expect(line.status).toBe("ok")
  })

  it("warns when the spending runs ahead of the month", () => {
    const [line] = buildBudgetLines({
      ...base,
      today: "2026-09-09",
      budgets: [{ categoryId: "mercado", limitCents: 80000 }],
      transactions: [tx({ amountCents: 60000 })],
    })

    expect(line.status).toBe("atencao")
  })

  it("does not warn about the same spending late in the month", () => {
    const [line] = buildBudgetLines({
      ...base,
      today: "2026-09-28",
      budgets: [{ categoryId: "mercado", limitCents: 80000 }],
      transactions: [tx({ amountCents: 60000 })],
    })

    expect(line.status).toBe("ok")
  })

  it("calls it blown once the limit is passed, and keeps the bar whole", () => {
    const [line] = buildBudgetLines({
      ...base,
      budgets: [{ categoryId: "mercado", limitCents: 80000 }],
      transactions: [tx({ amountCents: 95000 })],
    })

    expect(line.status).toBe("estourado")
    expect(line.remainingCents).toBe(-15000)
    expect(line.usedRatio).toBe(1)
  })

  it("counts what the children of a category spent", () => {
    const [line] = buildBudgetLines({
      ...base,
      categories: [category({}), category({ id: "feira", name: "Feira", parentId: "mercado" })],
      budgets: [{ categoryId: "mercado", limitCents: 80000 }],
      transactions: [tx({ amountCents: 20000 }), tx({ id: "t2", categoryId: "feira", amountCents: 15000 })],
    })

    expect(line.spentCents).toBe(35000)
  })

  it("ignores money that only moved between the user's own pockets", () => {
    const [line] = buildBudgetLines({
      ...base,
      budgets: [{ categoryId: "mercado", limitCents: 80000 }],
      transactions: [
        tx({ id: "transf", origin: "transfer", amountCents: 50000 }),
        tx({ id: "ajuste", origin: "adjustment", amountCents: 50000 }),
        tx({ id: "fatura", isInvoicePayment: true, amountCents: 50000 }),
        tx({ id: "marcador", settledVia: "card", amountCents: 50000 }),
        tx({ id: "real", amountCents: 10000 }),
      ],
    })

    expect(line.spentCents).toBe(10000)
  })

  it("leaves income out of a spending budget", () => {
    const [line] = buildBudgetLines({
      ...base,
      budgets: [{ categoryId: "mercado", limitCents: 80000 }],
      transactions: [tx({ direction: "in", amountCents: 70000 })],
    })

    expect(line.spentCents).toBe(0)
  })

  it("drops a budget whose category no longer exists", () => {
    const lines = buildBudgetLines({
      ...base,
      budgets: [{ categoryId: "apagada", limitCents: 80000 }],
      transactions: [],
    })

    expect(lines).toEqual([])
  })
})

describe("sumBudgets", () => {
  it("adds the limits and what was spent against them", () => {
    const lines = buildBudgetLines({
      ...base,
      categories: [category({}), category({ id: "lazer", name: "Lazer" })],
      budgets: [
        { categoryId: "mercado", limitCents: 80000 },
        { categoryId: "lazer", limitCents: 20000 },
      ],
      transactions: [tx({ amountCents: 30000 }), tx({ id: "t2", categoryId: "lazer", amountCents: 5000 })],
    })

    expect(sumBudgets(lines)).toEqual({
      limitCents: 100000,
      spentCents: 35000,
      remainingCents: 65000,
    })
  })
})
