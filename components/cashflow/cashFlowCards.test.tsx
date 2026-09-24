import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CashFlowChart } from "./CashFlowChart"
import { CashFlowDays } from "./CashFlowDays"
import { CashFlowSummary } from "./CashFlowSummary"
import { buildCashFlow } from "@/lib/domain/cashFlow"
import type { Transaction } from "@/lib/types"

const TODAY = "2026-09-24"

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    origin: "account",
    direction: "out",
    amountCents: 120000,
    description: "Aluguel",
    categoryId: "c1",
    categoryName: "Casa",
    categoryColor: "#111111",
    categoryIcon: "Home",
    date: "2026-09-26",
    competenceMonth: "2026-09",
    createdAt: 0,
    updatedAt: 0,
    settled: false,
    accountId: "a1",
    ...overrides,
  }
}

const flow = buildCashFlow({
  today: TODAY,
  days: 30,
  balanceCents: 100000,
  transactions: [tx({}), tx({ id: "t2", date: "2026-10-05", direction: "in", amountCents: 400000, description: "Salário" })],
  openInvoices: [],
  cardsById: new Map(),
})

describe("CashFlowSummary", () => {
  it("names the tightest day and the first one in the red", () => {
    render(<CashFlowSummary flow={flow} days={30} />)

    expect(screen.getByText("em 26/09/2026")).toBeDefined()
    expect(screen.getByText("26/09/2026")).toBeDefined()
  })

  it("says so when the balance never goes under", () => {
    const safe = buildCashFlow({
      today: TODAY,
      days: 30,
      balanceCents: 500000,
      transactions: [tx({})],
      openInvoices: [],
      cardsById: new Map(),
    })
    render(<CashFlowSummary flow={safe} days={30} />)

    expect(screen.getByText("Nenhum")).toBeDefined()
  })
})

describe("CashFlowDays", () => {
  it("lists only the days that have movement", () => {
    const { container } = render(<CashFlowDays flow={flow} days={30} />)

    expect(screen.getByText("Aluguel")).toBeDefined()
    expect(screen.getByText("Salário")).toBeDefined()
    expect(container.querySelectorAll("ul > li").length).toBeLessThan(6)
  })

  it("marks a simulated entry as not real", () => {
    const simulated = buildCashFlow({
      today: TODAY,
      days: 30,
      balanceCents: 100000,
      transactions: [],
      openInvoices: [],
      cardsById: new Map(),
      simulated: [
        { id: "s1", date: "2026-09-26", description: "Geladeira 1/10", amountCents: 30000, direction: "out", kind: "simulado" },
      ],
    })
    render(<CashFlowDays flow={simulated} days={30} />)

    expect(screen.getByText("simulado")).toBeDefined()
  })

  it("says when nothing is coming", () => {
    const empty = buildCashFlow({
      today: TODAY,
      days: 30,
      balanceCents: 100000,
      transactions: [],
      openInvoices: [],
      cardsById: new Map(),
    })
    render(<CashFlowDays flow={empty} days={30} />)

    expect(screen.getByText(/Nada previsto/)).toBeDefined()
  })
})

describe("CashFlowChart", () => {
  it("describes the projection for anyone not seeing the drawing", () => {
    render(<CashFlowChart flow={flow} hidden={false} />)

    expect(screen.getByRole("img", { name: /Saldo projetado até 24\/10\/2026/ })).toBeDefined()
  })
})
