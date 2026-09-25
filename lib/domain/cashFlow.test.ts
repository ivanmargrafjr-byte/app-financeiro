import { describe, expect, it } from "vitest"

import { buildCashFlow, daysWithMovement, type CashFlowItem } from "./cashFlow"
import type { Card, Invoice, Transaction } from "@/lib/types"

const TODAY = "2026-09-24"

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    origin: "account",
    direction: "out",
    amountCents: 10000,
    description: "Conta de luz",
    categoryId: "c1",
    categoryName: "Casa",
    categoryColor: "#111111",
    categoryIcon: "Home",
    date: TODAY,
    competenceMonth: "2026-09",
    createdAt: 0,
    updatedAt: 0,
    settled: false,
    accountId: "a1",
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
    totalAmountCents: 50000,
    status: "open",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

const CARDS = new Map<string, Card>([
  [
    "card1",
    {
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
    },
  ],
])

const base = {
  today: TODAY,
  days: 30,
  balanceCents: 100000,
  transactions: [] as Transaction[],
  openInvoices: [] as Invoice[],
  cardsById: CARDS,
}

describe("buildCashFlow", () => {
  it("walks the balance forward one day at a time", () => {
    const flow = buildCashFlow({
      ...base,
      transactions: [
        tx({ id: "luz", date: "2026-09-26", amountCents: 30000 }),
        tx({ id: "salario", date: "2026-09-30", direction: "in", amountCents: 200000 }),
      ],
    })

    expect(flow.days[0].balanceCents).toBe(100000)
    expect(flow.days[2].balanceCents).toBe(70000)
    expect(flow.days[6].balanceCents).toBe(270000)
    expect(flow.endBalanceCents).toBe(270000)
  })

  it("names the first day the balance goes under, and the lowest point", () => {
    const flow = buildCashFlow({
      ...base,
      transactions: [
        tx({ id: "aluguel", date: "2026-09-26", amountCents: 120000 }),
        tx({ id: "escola", date: "2026-09-28", amountCents: 50000 }),
        tx({ id: "salario", date: "2026-10-05", direction: "in", amountCents: 400000 }),
      ],
    })

    expect(flow.firstNegative).toEqual({ date: "2026-09-26", cents: -20000 })
    expect(flow.lowest).toEqual({ date: "2026-09-28", cents: -70000 })
    expect(flow.endBalanceCents).toBe(330000)
  })

  it("leaves firstNegative null when the money never runs out", () => {
    const flow = buildCashFlow({ ...base, transactions: [tx({ date: "2026-09-26" })] })

    expect(flow.firstNegative).toBeNull()
    expect(flow.lowest).toEqual({ date: "2026-09-26", cents: 90000 })
  })

  it("brings an overdue bill to today instead of dropping it", () => {
    const flow = buildCashFlow({
      ...base,
      transactions: [tx({ id: "atrasada", date: "2026-09-10", amountCents: 40000 })],
    })

    expect(flow.days[0].outCents).toBe(40000)
    expect(flow.days[0].balanceCents).toBe(60000)
  })

  it("takes invoices out on their due date, under the card's name", () => {
    const flow = buildCashFlow({ ...base, openInvoices: [invoice({})] })

    const dueDay = flow.days.find((d) => d.date === "2026-10-01")!
    expect(dueDay.outCents).toBe(50000)
    expect(dueDay.items[0].description).toBe("Fatura Nubank")
  })

  it("ignores card purchases and invoice payments, which the invoice already covers", () => {
    const flow = buildCashFlow({
      ...base,
      transactions: [
        tx({ id: "compra", origin: "card", amountCents: 20000, date: "2026-09-26" }),
        tx({ id: "pagamento", isInvoicePayment: true, amountCents: 50000, date: "2026-10-01" }),
      ],
      openInvoices: [invoice({})],
    })

    expect(flow.endBalanceCents).toBe(50000)
  })

  it("stops at the horizon", () => {
    const flow = buildCashFlow({
      ...base,
      days: 7,
      transactions: [tx({ id: "depois", date: "2026-10-20", amountCents: 90000 })],
    })

    expect(flow.days).toHaveLength(8)
    expect(flow.endBalanceCents).toBe(100000)
  })

  it("counts a simulated purchase without touching the recorded ones", () => {
    const simulated: CashFlowItem[] = [
      { id: "sim-1", date: "2026-09-26", description: "Compra simulada", amountCents: 150000, direction: "out", kind: "simulado" },
    ]
    const flow = buildCashFlow({ ...base, simulated })

    expect(flow.firstNegative).toEqual({ date: "2026-09-26", cents: -50000 })
    expect(daysWithMovement(flow)).toHaveLength(1)
    expect(daysWithMovement(flow)[0].items[0].kind).toBe("simulado")
  })

  it("starts already negative when the accounts are in the red today", () => {
    const flow = buildCashFlow({ ...base, balanceCents: -5000 })

    expect(flow.firstNegative).toEqual({ date: TODAY, cents: -5000 })
  })
})

describe("buildCashFlow with the prudent scenario", () => {
  const expected = tx({
    id: "freela",
    direction: "in",
    amountCents: 300000,
    description: "Freela",
    date: "2026-09-30",
    incomeExpectation: "esperada",
    counterparty: "Cliente X",
  })
  const confirmed = tx({
    id: "salario",
    direction: "in",
    amountCents: 400000,
    description: "Salário",
    date: "2026-09-30",
    incomeExpectation: "confirmada",
  })

  it("counts every income when the scenario is not prudent", () => {
    const flow = buildCashFlow({ ...base, transactions: [expected, confirmed] })

    expect(flow.endBalanceCents).toBe(100000 + 700000)
  })

  it("leaves out what is merely expected when it is", () => {
    const flow = buildCashFlow({
      ...base,
      transactions: [expected, confirmed],
      confirmedIncomeOnly: true,
    })

    expect(flow.endBalanceCents).toBe(100000 + 400000)
  })

  it("never drops an expense, however prudent the scenario", () => {
    const flow = buildCashFlow({
      ...base,
      transactions: [tx({ id: "conta", amountCents: 50000, date: "2026-09-26" })],
      confirmedIncomeOnly: true,
    })

    expect(flow.endBalanceCents).toBe(50000)
  })

  it("carries who owes a receivable into the day it lands", () => {
    const flow = buildCashFlow({ ...base, transactions: [expected] })
    const day = daysWithMovement(flow)[0]

    expect(day.items[0].counterparty).toBe("Cliente X")
    expect(day.items[0].expectation).toBe("esperada")
  })
})
