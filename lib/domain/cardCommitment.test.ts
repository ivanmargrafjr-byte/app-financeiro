import { describe, expect, it } from "vitest"

import { cardUsage, commitmentByMonth, openInstallmentPlans } from "./cardCommitment"
import type { Card, Invoice, Transaction } from "@/lib/types"

function card(overrides: Partial<Card>): Card {
  return {
    id: "card1",
    name: "Nubank",
    limitCents: 500000,
    closingDay: 25,
    dueDay: 1,
    linkedAccountId: "a1",
    icon: "CreditCard",
    color: "#820ad1",
    archived: false,
    createdAt: 0,
    ...overrides,
  }
}

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: "i1",
    cardId: "card1",
    referenceMonth: "2026-09",
    closingDate: "2026-09-25",
    dueDate: "2026-10-01",
    totalAmountCents: 100000,
    status: "open",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function parcel(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    origin: "card",
    direction: "out",
    amountCents: 20000,
    description: "Geladeira",
    categoryId: "c1",
    categoryName: "Casa",
    categoryColor: "#111",
    categoryIcon: "Home",
    date: "2026-09-10",
    competenceMonth: "2026-10",
    createdAt: 0,
    updatedAt: 0,
    settled: true,
    cardId: "card1",
    invoiceId: "i1",
    installmentGroupId: "g1",
    installmentNumber: 1,
    installmentTotal: 10,
    ...overrides,
  }
}

const CARDS = new Map([["card1", card({})], ["card2", card({ id: "card2", name: "Itaú" })]])

describe("commitmentByMonth", () => {
  it("puts each open invoice in the month it comes due", () => {
    const months = commitmentByMonth({
      invoices: [
        invoice({ id: "i-out", dueDate: "2026-10-01", totalAmountCents: 150000 }),
        invoice({ id: "i-nov", dueDate: "2026-11-01", totalAmountCents: 90000 }),
        invoice({ id: "i-nov2", cardId: "card2", dueDate: "2026-11-01", totalAmountCents: 30000 }),
      ],
      cardsById: CARDS,
      fromMonth: "2026-10",
      months: 3,
    })

    expect(months.map((m) => m.totalCents)).toEqual([150000, 120000, 0])
    expect(months[1].byCard).toEqual([
      { cardId: "card1", cents: 90000 },
      { cardId: "card2", cents: 30000 },
    ])
  })

  it("leaves out invoices already paid", () => {
    const months = commitmentByMonth({
      invoices: [invoice({ status: "paid" })],
      cardsById: CARDS,
      fromMonth: "2026-10",
      months: 1,
    })

    expect(months[0].totalCents).toBe(0)
  })
})

describe("cardUsage", () => {
  it("reports what is owed against the limit", () => {
    const [usage] = cardUsage(
      [card({})],
      [invoice({ totalAmountCents: 200000 }), invoice({ id: "i2", totalAmountCents: 50000, dueDate: "2026-11-01" })]
    )

    expect(usage.committedCents).toBe(250000)
    expect(usage.availableCents).toBe(250000)
    expect(usage.usedRatio).toBe(0.5)
  })

  it("does not let an over-limit card overflow the bar", () => {
    const [usage] = cardUsage([card({ limitCents: 100000 })], [invoice({ totalAmountCents: 250000 })])

    expect(usage.availableCents).toBe(-150000)
    expect(usage.usedRatio).toBe(1)
  })
})

describe("openInstallmentPlans", () => {
  const parcels = [
    parcel({ id: "p1", installmentNumber: 1, invoiceId: "paid-1", competenceMonth: "2026-08" }),
    parcel({ id: "p2", installmentNumber: 2, invoiceId: "open-1", competenceMonth: "2026-09" }),
    parcel({ id: "p3", installmentNumber: 3, invoiceId: "open-2", competenceMonth: "2026-10" }),
  ]

  it("counts only the parcels still sitting in open invoices", () => {
    const [plan] = openInstallmentPlans(parcels, new Set(["open-1", "open-2"]))

    expect(plan.remainingParcels).toBe(2)
    expect(plan.remainingCents).toBe(40000)
    expect(plan.totalParcels).toBe(10)
    expect(plan.lastMonth).toBe("2026-10")
    expect(plan.description).toBe("Geladeira")
  })

  it("drops a plan whose parcels were all paid", () => {
    expect(openInstallmentPlans(parcels, new Set())).toEqual([])
  })

  it("ignores a purchase that was not split", () => {
    const single = parcel({ id: "avulsa", installmentGroupId: undefined, installmentTotal: 1 })

    expect(openInstallmentPlans([single], new Set(["i1"]))).toEqual([])
  })

  it("orders by the month each one stops weighing", () => {
    const other = parcel({
      id: "outro",
      installmentGroupId: "g2",
      description: "Notebook",
      invoiceId: "open-3",
      competenceMonth: "2026-12",
    })
    const plans = openInstallmentPlans([...parcels, other], new Set(["open-1", "open-2", "open-3"]))

    expect(plans.map((p) => p.description)).toEqual(["Geladeira", "Notebook"])
  })
})
