/**
 * The round trip an alert makes: it names a month and a row, the click moves the screens
 * to that month, and the destination marks the row.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AlertList } from "./AlertList"
import { BudgetLines } from "@/components/budgets/BudgetLines"
import { GoalList } from "@/components/budgets/GoalList"
import { CashFlowDays } from "@/components/cashflow/CashFlowDays"
import { buildCashFlow } from "@/lib/domain/cashFlow"
import { MonthProvider, useMonth } from "@/lib/month/MonthProvider"
import { FOCUS_CLASS, focusAnchorId } from "@/lib/navigation/focus"
import type { Alert } from "@/lib/domain/alerts"
import type { BudgetLine } from "@/lib/domain/budget"
import type { Goal } from "@/lib/domain/goals"
import type { Category, Transaction } from "@/lib/types"

// Stands in for next/link, which needs a mounted app router to be clicked. What is being
// tested here is what AlertList does with the click, not how Next navigates.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const TODAY = "2026-09-24"

function alert(overrides: Partial<Alert>): Alert {
  return {
    id: "a1",
    kind: "orcamento",
    severity: "atencao",
    title: "Mercado passou do limite",
    because: "Gastou mais do que o limite.",
    href: "/orcamentos?foco=mercado",
    ...overrides,
  }
}

function Probe() {
  const { month, setMonth } = useMonth()
  return (
    <>
      <p>mês: {month}</p>
      <button type="button" onClick={() => setMonth("2026-07")}>
        ir para julho
      </button>
    </>
  )
}

function renderAlerts(alerts: Alert[]) {
  return render(
    <MonthProvider>
      <Probe />
      <AlertList alerts={alerts} emptyLabel="Nada por aqui" />
    </MonthProvider>
  )
}

describe("AlertList", () => {
  it("links to the row the alert is about, not just to the screen", () => {
    renderAlerts([alert({})])

    expect(
      screen.getByRole("link", { name: /Mercado passou do limite/ }).getAttribute("href")
    ).toBe("/orcamentos?foco=mercado")
  })

  it("takes the screens to the month the alert is about", () => {
    renderAlerts([alert({ month: "2026-09" })])

    fireEvent.click(screen.getByRole("button", { name: "ir para julho" }))
    expect(screen.getByText("mês: 2026-07")).toBeTruthy()

    fireEvent.click(screen.getByRole("link", { name: /Mercado passou do limite/ }))
    expect(screen.getByText("mês: 2026-09")).toBeTruthy()
  })

  it("leaves the chosen month alone when the alert is not about a month", () => {
    renderAlerts([alert({ kind: "contrato", href: "/contratos/c1" })])

    fireEvent.click(screen.getByRole("button", { name: "ir para julho" }))
    fireEvent.click(screen.getByRole("link", { name: /Mercado passou do limite/ }))

    expect(screen.getByText("mês: 2026-07")).toBeTruthy()
  })
})

const category: Category = {
  id: "mercado",
  name: "Mercado",
  type: "despesa",
  icon: "ShoppingCart",
  color: "#111111",
  archived: false,
  isDefault: false,
  parentId: null,
}

function line(overrides: Partial<BudgetLine>): BudgetLine {
  return {
    category,
    limitCents: 80000,
    spentCents: 95000,
    remainingCents: -15000,
    usedRatio: 1,
    status: "estourado",
    ...overrides,
  }
}

describe("the destination marks the row", () => {
  it("rings the category the orçamento alert named", () => {
    const { container } = render(<BudgetLines lines={[line({})]} focusedIds={new Set(["mercado"])} />)
    const row = container.querySelector(`[id="${focusAnchorId("mercado")}"]`)

    expect(row?.className).toContain(FOCUS_CLASS)
  })

  it("leaves the other rows alone", () => {
    const { container } = render(
      <BudgetLines
        lines={[line({}), line({ category: { ...category, id: "lazer", name: "Lazer" } })]}
        focusedIds={new Set(["mercado"])}
      />
    )

    expect(container.querySelector(`[id="${focusAnchorId("lazer")}"]`)?.className).not.toContain(
      FOCUS_CLASS
    )
  })

  it("rings the meta the alert named", () => {
    const goal: Goal = {
      id: "g1",
      kind: "meta",
      name: "Viagem",
      targetCents: 500000,
      dueDate: "2026-12-20",
      savedCents: 100000,
      icon: "Plane",
      color: "#5a12d6",
      createdAt: 0,
    }
    const { container } = render(
      <GoalList goals={[goal]} today={TODAY} emptyLabel="" focusedIds={new Set(["g1"])} />
    )

    expect(container.querySelector(`[id="${focusAnchorId("g1")}"]`)?.className).toContain(FOCUS_CLASS)
  })

  it("rings the day the saldo alert named", () => {
    const tx: Transaction = {
      id: "t1",
      origin: "account",
      direction: "out",
      amountCents: 500000,
      description: "Aluguel",
      categoryId: "casa",
      categoryName: "Casa",
      categoryColor: "#111111",
      categoryIcon: "Home",
      date: "2026-09-28",
      competenceMonth: "2026-09",
      createdAt: 0,
      updatedAt: 0,
      settled: false,
      accountId: "a1",
    }
    const flow = buildCashFlow({
      today: TODAY,
      days: 30,
      balanceCents: 10000,
      transactions: [tx],
      openInvoices: [],
      cardsById: new Map(),
    })
    const { container } = render(
      <CashFlowDays flow={flow} days={30} focusedIds={new Set(["2026-09-28"])} />
    )

    expect(container.querySelector(`[id="${focusAnchorId("2026-09-28")}"]`)?.className).toContain(
      FOCUS_CLASS
    )
  })
})
