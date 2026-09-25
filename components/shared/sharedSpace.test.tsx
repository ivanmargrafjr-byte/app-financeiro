import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SharedExpenseList } from "./SharedExpenseList"
import { SpaceBalances } from "./SpaceBalances"
import { balances, settleUp, splitEqually, type SharedExpense, type SpaceMember } from "@/lib/domain/sharedSpace"

const members: SpaceMember[] = [
  { uid: "ana", email: "ana@exemplo.com", name: "Ana Souza", role: "dono" },
  { uid: "bruno", email: "bruno@exemplo.com", name: "Bruno Lima", role: "membro" },
]

const expense: SharedExpense = {
  id: "e1",
  description: "Mercado",
  amountCents: 20000,
  date: "2026-09-10",
  paidByUid: "ana",
  splitCentsByUid: splitEqually(20000, ["ana", "bruno"]),
  createdByUid: "ana",
  createdAt: 0,
}

describe("SpaceBalances", () => {
  const result = balances([expense], [], ["ana", "bruno"])

  it("says who is owed and who owes, marking the reader", () => {
    render(
      <SpaceBalances
        balances={result}
        transfers={settleUp(result)}
        members={members}
        currentUid="ana"
      />
    )

    expect(screen.getByText("(você)")).toBeDefined()
    expect(screen.getByText(/a receber/)).toBeDefined()
    expect(screen.getByText(/a pagar/)).toBeDefined()
  })

  it("shows the payment that ends it, and offers to record it", () => {
    const onSettle = vi.fn()
    render(
      <SpaceBalances
        balances={result}
        transfers={settleUp(result)}
        members={members}
        currentUid="ana"
        onSettle={onSettle}
      />
    )

    expect(screen.getByText("Para acertar tudo:")).toBeDefined()
    expect(screen.getByRole("button", { name: "Registrar" })).toBeDefined()
  })

  it("says everyone is square when nobody owes anything", () => {
    render(
      <SpaceBalances
        balances={[{ uid: "ana", cents: 0 }, { uid: "bruno", cents: 0 }]}
        transfers={[]}
        members={members}
        currentUid="ana"
      />
    )

    expect(screen.getAllByText("em dia")).toHaveLength(2)
  })
})

describe("SharedExpenseList", () => {
  it("shows who paid and what each share was", () => {
    render(<SharedExpenseList expenses={[expense]} members={members} currentUid="bruno" />)

    expect(screen.getByText("Mercado")).toBeDefined()
    expect(screen.getByText(/pago por Ana/)).toBeDefined()
    expect(screen.getByText(/Ana 100.00 · você 100.00/)).toBeDefined()
  })

  it("promises nothing else is shared when the space is empty", () => {
    render(<SharedExpenseList expenses={[]} members={members} currentUid="ana" />)

    expect(screen.getByText(/fica visível para todos do espaço — e só isso/)).toBeDefined()
  })
})
