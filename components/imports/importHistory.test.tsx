import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ImportHistory } from "./ImportHistory"
import type { ImportBatch } from "@/lib/hooks/useImports"

function batch(overrides: Partial<ImportBatch>): ImportBatch {
  return {
    id: "b1",
    source: "ofx",
    accountId: "a1",
    fileName: "extrato-setembro.ofx",
    createdIds: ["t1", "t2", "t3"],
    settledIds: ["t4"],
    createdAt: new Date(2026, 8, 20, 10, 0, 0).getTime(),
    ...overrides,
  }
}

const accounts = new Map([["a1", "Nubank"]])

describe("ImportHistory", () => {
  it("says what the import did and where", () => {
    render(<ImportHistory imports={[batch({})]} accountNameById={accounts} onUndo={vi.fn()} />)

    expect(screen.getByText("extrato-setembro.ofx")).toBeDefined()
    expect(screen.getByText(/20\/09\/2026 · Nubank · 3 criados, 1 efetivado/)).toBeDefined()
  })

  it("keeps the plural honest for a single entry", () => {
    render(
      <ImportHistory
        imports={[batch({ createdIds: ["t1"], settledIds: [] })]}
        accountNameById={accounts}
        onUndo={vi.fn()}
      />
    )

    expect(screen.getByText(/1 criado$/)).toBeDefined()
  })

  it("asks before undoing, and says what will happen", async () => {
    const onUndo = vi.fn()
    render(<ImportHistory imports={[batch({})]} accountNameById={accounts} onUndo={onUndo} />)

    fireEvent.click(screen.getByRole("button", { name: /Desfazer/ }))

    expect(await screen.findByText(/Os 3 lançamentos criados por ela serão excluídos/)).toBeDefined()
    expect(screen.getByText(/voltam a ficar pendentes/)).toBeDefined()
    expect(onUndo).not.toHaveBeenCalled()
  })

  it("renders nothing when there is no import to undo", () => {
    const { container } = render(
      <ImportHistory imports={[]} accountNameById={accounts} onUndo={vi.fn()} />
    )

    expect(container.firstChild).toBeNull()
  })
})
