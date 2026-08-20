import { render, screen } from "@testing-library/react"
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
  it("shows the balance and what is left after the invoices", () => {
    render(<BalanceCard balanceCents={797922} freeCents={613196} hidden={false} />)

    expect(screen.getByText("Saldo nas contas")).toBeDefined()
    expect(screen.getByText(/livres depois de pagar as faturas/)).toBeDefined()
  })

  it("says what is missing when the cards outrun the accounts", () => {
    render(<BalanceCard balanceCents={100000} freeCents={-50000} hidden={false} />)

    expect(screen.getByText(/para cobrir as faturas em aberto/)).toBeDefined()
    // The shortfall is shown as a positive figure next to the word "faltam".
    expect(screen.getByText("R$ 500")).toBeDefined()
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
