import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { InstallmentPlans } from "./InstallmentPlans"
import type { InstallmentPlan } from "@/lib/domain/cardCommitment"

const plan: InstallmentPlan = {
  groupId: "g1",
  description: "Geladeira",
  cardId: "card1",
  totalParcels: 10,
  remainingParcels: 3,
  remainingCents: 135000,
  lastMonth: "2026-12",
}

describe("InstallmentPlans", () => {
  it("keeps the row and its text constrained, so the amount cannot be pushed out", () => {
    const { container } = render(
      <InstallmentPlans plans={[plan]} cardNameById={new Map([["card1", "Nubank"]])} />
    )

    const row = container.querySelector("li")!
    expect(row.className).toContain("min-w-0")
    expect(row.querySelector("p")!.className).toContain("truncate")
  })

  it("says how many are left and when it ends", () => {
    render(<InstallmentPlans plans={[plan]} cardNameById={new Map([["card1", "Nubank"]])} />)

    expect(screen.getByText(/restam 3 de 10 · termina em dezembro de 2026/)).toBeDefined()
  })

  it("says so when nothing is running", () => {
    render(<InstallmentPlans plans={[]} cardNameById={new Map()} />)

    expect(screen.getByText(/Nenhuma compra parcelada/)).toBeDefined()
  })
})
