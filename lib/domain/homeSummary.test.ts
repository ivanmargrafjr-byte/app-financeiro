import { describe, expect, it } from "vitest"

import {
  buildUpcoming,
  countsAsOpenInvoice,
  estimateBalanceThrough,
  estimateHorizon,
  projectBalanceToMonthEnd,
  sumOpenInvoicesCents,
} from "./homeSummary"
import type { Card, Invoice, Transaction } from "@/lib/types"

const TODAY = "2026-08-19"

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
    competenceMonth: "2026-08",
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
    referenceMonth: "2026-08",
    closingDate: "2026-08-25",
    dueDate: "2026-09-01",
    totalAmountCents: 184726,
    status: "open",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

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

const CARDS = new Map([["card1", card({})]])

describe("countsAsOpenInvoice", () => {
  it("counts an open invoice with a balance", () => {
    expect(countsAsOpenInvoice(invoice({}), CARDS)).toBe(true)
  })

  it("ignores an invoice already paid", () => {
    expect(countsAsOpenInvoice(invoice({ status: "paid" }), CARDS)).toBe(false)
  })

  it("ignores an invoice left empty after its purchases were deleted", () => {
    expect(countsAsOpenInvoice(invoice({ totalAmountCents: 0 }), CARDS)).toBe(false)
  })

  it("ignores an invoice the replacement card already carries", () => {
    const replaced = new Map([
      ["card1", card({ archived: true, archivedFromMonth: "2026-08" })],
    ])

    expect(countsAsOpenInvoice(invoice({ referenceMonth: "2026-08" }), replaced)).toBe(false)
    // The months before the cutoff exist only on the old card, so they still count.
    expect(countsAsOpenInvoice(invoice({ referenceMonth: "2026-07" }), replaced)).toBe(true)
  })
})

describe("sumOpenInvoicesCents", () => {
  it("adds up what is owed across cards", () => {
    const total = sumOpenInvoicesCents(
      [invoice({ id: "i1", totalAmountCents: 100000 }), invoice({ id: "i2", totalAmountCents: 84726 })],
      CARDS
    )

    expect(total).toBe(184726)
  })

  it("is zero when nothing is open", () => {
    expect(sumOpenInvoicesCents([invoice({ status: "paid" })], CARDS)).toBe(0)
  })
})

describe("projectBalanceToMonthEnd", () => {
  it("applies the pending entries that still land this month", () => {
    const result = projectBalanceToMonthEnd({
      today: TODAY,
      balanceCents: 797922,
      transactions: [
        tx({ id: "t1", direction: "out", amountCents: 50000, date: "2026-08-25" }),
        tx({ id: "t2", direction: "in", amountCents: 1630000, date: "2026-08-30" }),
      ],
    })

    expect(result.throughDate).toBe("2026-08-31")
    expect(result.cents).toBe(797922 - 50000 + 1630000)
  })

  it("includes an overdue entry still unchecked, since that money will still leave", () => {
    const result = projectBalanceToMonthEnd({
      today: TODAY,
      balanceCents: 100000,
      transactions: [tx({ amountCents: 30000, date: "2026-08-10" })],
    })

    expect(result.cents).toBe(70000)
  })

  it("ignores what falls in the next month", () => {
    const result = projectBalanceToMonthEnd({
      today: TODAY,
      balanceCents: 100000,
      transactions: [tx({ amountCents: 30000, date: "2026-09-02" })],
    })

    expect(result.cents).toBe(100000)
  })

  it("ignores entries already efetivadas, which the balance already reflects", () => {
    const result = projectBalanceToMonthEnd({
      today: TODAY,
      balanceCents: 100000,
      transactions: [tx({ settled: true, amountCents: 30000, date: "2026-08-25" })],
    })

    expect(result.cents).toBe(100000)
  })
})

describe("buildUpcoming", () => {
  it("lists pending lançamentos and invoices due, oldest date first", () => {
    const items = buildUpcoming({
      today: TODAY,
      transactions: [tx({ id: "t1", description: "Netflix", date: "2026-09-08", amountCents: 5590 })],
      openInvoices: [invoice({ dueDate: "2026-09-01" })],
      cardsById: CARDS,
    })

    expect(items.map((i) => [i.date, i.description])).toEqual([
      ["2026-09-01", "Fatura Nubank"],
      ["2026-09-08", "Netflix"],
    ])
  })

  it("stops at the end of the window", () => {
    const items = buildUpcoming({
      today: TODAY,
      transactions: [
        tx({ id: "dentro", date: "2026-09-18" }),
        tx({ id: "fora", date: "2026-09-19" }),
      ],
      openInvoices: [],
      cardsById: CARDS,
    })

    expect(items.map((i) => i.id)).toEqual(["dentro"])
  })

  it("leaves out what already happened", () => {
    const items = buildUpcoming({
      today: TODAY,
      transactions: [tx({ id: "ontem", date: "2026-08-18" })],
      openInvoices: [],
      cardsById: CARDS,
    })

    expect(items).toEqual([])
  })

  it("leaves out entries already efetivadas", () => {
    const items = buildUpcoming({
      today: TODAY,
      transactions: [tx({ settled: true, date: "2026-08-25" })],
      openInvoices: [],
      cardsById: CARDS,
    })

    expect(items).toEqual([])
  })

  it("does not list an invoice payment twice", () => {
    // The fatura is already a row; its payment entry must not add a second one.
    const items = buildUpcoming({
      today: TODAY,
      transactions: [tx({ isInvoicePayment: true, date: "2026-09-01" })],
      openInvoices: [invoice({ dueDate: "2026-09-01" })],
      cardsById: CARDS,
    })

    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe("fatura")
  })

  it("carries the card's identity onto the fatura row", () => {
    const [fatura] = buildUpcoming({
      today: TODAY,
      transactions: [],
      openInvoices: [invoice({ dueDate: "2026-09-01" })],
      cardsById: CARDS,
    })

    expect(fatura).toMatchObject({
      description: "Fatura Nubank",
      direction: "out",
      color: "#820ad1",
      amountCents: 184726,
    })
  })
})

describe("estimateHorizon", () => {
  it("runs to the end of the month being viewed", () => {
    expect(estimateHorizon(TODAY, "2026-10")).toBe("2026-10-31")
  })

  it("never falls back past the current month, so browsing back keeps today's picture", () => {
    expect(estimateHorizon(TODAY, "2026-05")).toBe("2026-08-31")
  })
})

describe("estimateBalanceThrough", () => {
  const base = {
    throughDate: "2026-08-31",
    balanceCents: 500000,
    transactions: [] as Transaction[],
    openInvoices: [] as Invoice[],
    cardsById: CARDS,
  }

  it("carries a pendência from an earlier month that was never efetivada", () => {
    const result = estimateBalanceThrough({
      ...base,
      transactions: [tx({ id: "t-jul", date: "2026-07-10", competenceMonth: "2026-07" })],
    })
    expect(result).toBe(490000)
  })

  it("adds pending receitas and subtracts pending despesas alike", () => {
    const result = estimateBalanceThrough({
      ...base,
      transactions: [
        tx({ id: "t-in", direction: "in", amountCents: 30000 }),
        tx({ id: "t-out", direction: "out", amountCents: 10000 }),
      ],
    })
    expect(result).toBe(520000)
  })

  it("leaves out what falls due after the horizon", () => {
    const result = estimateBalanceThrough({
      ...base,
      transactions: [tx({ id: "t-set", date: "2026-09-05", competenceMonth: "2026-09" })],
    })
    expect(result).toBe(500000)
  })

  it("ignores entries already efetivadas — the balance already has them", () => {
    const result = estimateBalanceThrough({
      ...base,
      transactions: [tx({ id: "t-ok", settled: true })],
    })
    expect(result).toBe(500000)
  })

  it("does not count an invoice payment twice against its own fatura", () => {
    const result = estimateBalanceThrough({
      ...base,
      transactions: [tx({ id: "t-pay", amountCents: 184726, isInvoicePayment: true })],
      openInvoices: [invoice({ dueDate: "2026-08-10" })],
    })
    expect(result).toBe(500000 - 184726)
  })

  it("subtracts a fatura that came due in an earlier month and was never paid", () => {
    const result = estimateBalanceThrough({
      ...base,
      openInvoices: [invoice({ id: "i-jul", referenceMonth: "2026-06", dueDate: "2026-07-01" })],
    })
    expect(result).toBe(500000 - 184726)
  })

  it("leaves out a fatura due after the horizon", () => {
    const result = estimateBalanceThrough({
      ...base,
      openInvoices: [invoice({ id: "i-set", referenceMonth: "2026-09", dueDate: "2026-10-01" })],
    })
    expect(result).toBe(500000)
  })
})
