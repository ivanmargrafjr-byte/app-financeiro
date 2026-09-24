import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Amount } from "./Amount"
import { BalanceCard, OpenInvoicesCard } from "./BalanceCards"
import { MonthFlowCard } from "./MonthFlowCard"
import { UpcomingCard } from "./UpcomingCard"
import type { UpcomingItem } from "@/lib/domain/homeSummary"

const TODAY = "2026-08-19"

/** Intl pt-BR separates "R$" from the digits with a non-breaking space. */
function text(container: HTMLElement): string {
  return (container.textContent ?? "").replace(/\u00a0/g, " ")
}

describe("Amount", () => {
  it("splits the cents out so the reais can be set larger", () => {
    const { container } = render(<Amount cents={797922} />)

    expect(text(container)).toBe("R$ 7.979,22")
    // The cents live in their own element — that's what carries the smaller type.
    expect(container.querySelector("span span")?.textContent).toBe(",22")
  })

  it("masks the value when hidden, without leaking the digits", () => {
    const { container } = render(<Amount cents={797922} hidden />)

    expect(text(container)).toBe("R$ ••••")
    expect(text(container)).not.toContain("7.979")
  })

  it("marks a figure that still moves with a tilde", () => {
    const { container } = render(<Amount cents={184726} approximate />)

    expect(text(container)).toBe("~R$ 1.847,26")
  })
})

describe("BalanceCard", () => {
  const free = {
    throughDate: "2026-08-31",
    balanceCents: 797922,
    committedCents: 50000,
    invoicesCents: 134726,
    reservedCents: 0,
    expectedIncomeCents: 0,
    cents: 613196,
  }

  it("leads with what is free to spend, with the balance underneath", () => {
    render(<BalanceCard free={free} hidden={false} />)

    expect(screen.getByText(/Livre para gastar até 31\/08\/2026/)).toBeDefined()
    expect(screen.getByText("R$ 6.131")).toBeDefined()
    expect(screen.getByText("R$ 7.979")).toBeDefined()
  })

  it("opens the breakdown that explains the figure", async () => {
    const { container } = render(<BalanceCard free={{ ...free, reservedCents: 60000 }} hidden={false} />)

    fireEvent.click(screen.getByRole("button", { name: /Livre para gastar/ }))

    expect(await screen.findByText("Faturas em aberto")).toBeDefined()
    expect(screen.getByText("Reservado")).toBeDefined()
    expect(text(container)).toContain("-R$ 600,00")
  })

  it("reports income that has not landed apart from the total", async () => {
    render(<BalanceCard free={{ ...free, expectedIncomeCents: 400000 }} hidden={false} />)

    fireEvent.click(screen.getByRole("button", { name: /Livre para gastar/ }))

    expect(await screen.findByText(/a receber/)).toBeDefined()
    expect(screen.getByText(/ainda não creditados/)).toBeDefined()
  })

  it("shows a shortfall as a negative figure, not as a missing amount", () => {
    const { container } = render(<BalanceCard free={{ ...free, cents: -50000 }} hidden={false} />)

    expect(text(container)).toContain("-R$ 500,00")
  })
})

describe("OpenInvoicesCard", () => {
  it("counts the invoices and dates the next one", () => {
    render(
      <OpenInvoicesCard
        totalCents={184726}
        invoiceCount={2}
        nextDueDate="2026-09-01"
        today={TODAY}
        hidden={false}
      />
    )

    expect(screen.getByText("2 faturas · a próxima vence em 01/09/2026")).toBeDefined()
  })

  it("puts an overdue invoice in the past tense", () => {
    render(
      <OpenInvoicesCard
        totalCents={50000}
        invoiceCount={1}
        nextDueDate="2026-08-05"
        today={TODAY}
        hidden={false}
      />
    )

    expect(screen.getByText("1 fatura · a próxima venceu em 05/08/2026")).toBeDefined()
  })

  it("says so plainly when nothing is owed", () => {
    render(
      <OpenInvoicesCard
        totalCents={0}
        invoiceCount={0}
        nextDueDate={null}
        today={TODAY}
        hidden={false}
      />
    )

    expect(screen.getByText("Nenhuma fatura em aberto")).toBeDefined()
  })
})

describe("MonthFlowCard", () => {
  const flow = { monthName: "Agosto", receitasCents: 924000, despesasCents: 647000 }

  it("shows the projection for the current month", () => {
    render(
      <MonthFlowCard
        {...flow}
        projection={{ throughDate: "2026-08-31", cents: 277000 }}
        hidden={false}
      />
    )

    expect(screen.getByText("Fluxo de agosto")).toBeDefined()
    expect(screen.getByText(/Saldo projetado até 31\/08\/2026/)).toBeDefined()
  })

  it("drops the projection when the user paged to another month", () => {
    render(<MonthFlowCard {...flow} projection={null} hidden={false} />)

    expect(screen.queryByText(/Saldo projetado/)).toBeNull()
  })
})

describe("UpcomingCard", () => {
  const items: UpcomingItem[] = [
    {
      id: "i1",
      date: "2026-09-01",
      description: "Fatura Nubank",
      amountCents: 184726,
      direction: "out",
      kind: "fatura",
      icon: "CreditCard",
      color: "#820ad1",
    },
    {
      id: "t1",
      date: "2026-09-08",
      description: "Netflix",
      amountCents: 5590,
      direction: "out",
      kind: "lancamento",
      icon: "Tv",
      color: "#e50914",
    },
  ]

  it("lists each commitment with its day and what it is", () => {
    render(<UpcomingCard items={items} days={30} hidden={false} />)

    expect(screen.getByText("Fatura Nubank")).toBeDefined()
    expect(screen.getByText("Netflix")).toBeDefined()
    expect(screen.getByText("01")).toBeDefined()
    expect(screen.getByText("fatura do cartão")).toBeDefined()
    expect(screen.getByText("lançamento pendente")).toBeDefined()
  })

  it("says the window is clear instead of showing an empty list", () => {
    render(<UpcomingCard items={[]} days={30} hidden={false} />)

    expect(screen.getByText("Nada previsto para os próximos 30 dias.")).toBeDefined()
  })

  it("masks the amounts along with everything else", () => {
    const { container } = render(<UpcomingCard items={items} days={30} hidden />)

    expect(text(container)).not.toContain("1.847")
  })
})
