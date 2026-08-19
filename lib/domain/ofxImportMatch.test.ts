import { describe, expect, it } from "vitest"

import { isSelectedByDefault, matchOfxTransactions, type ExistingEntry } from "./ofxImportMatch"
import type { OfxTransaction } from "./ofx"

const movement = (
  overrides: Partial<OfxTransaction> & Pick<OfxTransaction, "fitId" | "amountCents">
): OfxTransaction => ({
  date: "2026-08-05",
  description: "LANCAMENTO",
  type: "DEBIT",
  ...overrides,
})

const entry = (overrides: Partial<ExistingEntry> & Pick<ExistingEntry, "id">): ExistingEntry => ({
  description: "Lançamento",
  amountCents: 10000,
  direction: "out",
  date: "2026-08-05",
  settled: false,
  ...overrides,
})

describe("matchOfxTransactions", () => {
  it("creates a new lançamento when nothing in the account resembles the movement", () => {
    const result = matchOfxTransactions([movement({ fitId: "1", amountCents: -12950 })], [])

    expect(result[0].kind).toBe("new")
    expect(result[0].matchedId).toBeNull()
  })

  it("recognises a movement imported on an earlier run by its FITID", () => {
    const existing = [entry({ id: "tx1", ofxFitId: "1", settled: true })]

    const result = matchOfxTransactions([movement({ fitId: "1", amountCents: -10000 })], existing)

    expect(result[0].kind).toBe("already-imported")
    expect(result[0].matchedId).toBe("tx1")
  })

  it("recognises it even when the bank restates the value or date", () => {
    // FITID is the bank's own identifier — it outranks any heuristic.
    const existing = [entry({ id: "tx1", ofxFitId: "1", amountCents: 999, date: "2026-01-01" })]

    const result = matchOfxTransactions([movement({ fitId: "1", amountCents: -10000 })], existing)

    expect(result[0].kind).toBe("already-imported")
  })

  it("flags a movement the user already efetivou, so the balance isn't hit twice", () => {
    const existing = [entry({ id: "tx1", settled: true, description: "Aluguel" })]

    const result = matchOfxTransactions(
      [movement({ fitId: "1", amountCents: -10000, description: "TED 341 IMOBILIARIA" })],
      existing
    )

    expect(result[0]).toEqual({
      movement: expect.objectContaining({ fitId: "1" }),
      kind: "already-settled",
      matchedId: "tx1",
    })
  })

  it("points a movement at the pendente it corresponds to, so it can be efetivado", () => {
    const existing = [entry({ id: "tx1", settled: false, description: "Salário" })]

    const result = matchOfxTransactions(
      [movement({ fitId: "1", amountCents: 10000, description: "CREDITO SALARIO" })],
      [{ ...existing[0], direction: "in" }]
    )

    expect(result[0].kind).toBe("matches-pending")
    expect(result[0].matchedId).toBe("tx1")
  })

  it("does not match a credit against a debit of the same value", () => {
    const existing = [entry({ id: "tx1", direction: "out" })]

    const result = matchOfxTransactions([movement({ fitId: "1", amountCents: 10000 })], existing)

    expect(result[0].kind).toBe("new")
  })

  it("tolerates the bank posting a couple of days after the lançamento's date", () => {
    const existing = [entry({ id: "tx1", date: "2026-08-05" })]

    const result = matchOfxTransactions(
      [movement({ fitId: "1", amountCents: -10000, date: "2026-08-08" })],
      existing
    )

    expect(result[0].kind).toBe("matches-pending")
  })

  it("stops tolerating past the window, so next week's identical bill isn't consumed", () => {
    const existing = [entry({ id: "tx1", date: "2026-08-05" })]

    const result = matchOfxTransactions(
      [movement({ fitId: "1", amountCents: -10000, date: "2026-08-09" })],
      existing
    )

    expect(result[0].kind).toBe("new")
  })

  it("matches on value and date even though the descriptions disagree entirely", () => {
    // The whole point: the bank writes its own wording, never the user's.
    const existing = [entry({ id: "tx1", description: "Aluguel" })]

    const result = matchOfxTransactions(
      [movement({ fitId: "1", amountCents: -10000, description: "TED 0341 IMOB SANTA RITA" })],
      existing
    )

    expect(result[0].kind).toBe("matches-pending")
  })

  it("gives each existing lançamento to at most one movement", () => {
    const existing = [entry({ id: "tx1" })]

    const result = matchOfxTransactions(
      [movement({ fitId: "1", amountCents: -10000 }), movement({ fitId: "2", amountCents: -10000 })],
      existing
    )

    expect(result.map((r) => r.kind)).toEqual(["matches-pending", "new"])
    expect(result[0].matchedId).toBe("tx1")
  })

  it("matches two identical debits against the two lançamentos that exist", () => {
    const existing = [entry({ id: "tx1" }), entry({ id: "tx2" })]

    const result = matchOfxTransactions(
      [movement({ fitId: "1", amountCents: -10000 }), movement({ fitId: "2", amountCents: -10000 })],
      existing
    )

    expect(result.map((r) => r.matchedId)).toEqual(["tx1", "tx2"])
  })

  it("prefers the candidate on the same day over one at the edge of the window", () => {
    const existing = [
      entry({ id: "far", date: "2026-08-02" }),
      entry({ id: "same-day", date: "2026-08-05" }),
    ]

    const result = matchOfxTransactions([movement({ fitId: "1", amountCents: -10000 })], existing)

    expect(result[0].matchedId).toBe("same-day")
  })

  it("uses the description to break a tie between two lançamentos of the same value and day", () => {
    const existing = [
      entry({ id: "outro", description: "Farmácia" }),
      entry({ id: "certo", description: "Supermercado Carrefour" }),
    ]

    const result = matchOfxTransactions(
      [movement({ fitId: "1", amountCents: -10000, description: "CARREFOUR SUPERMERCADO" })],
      existing
    )

    expect(result[0].matchedId).toBe("certo")
  })

  it("prefers the pendente when nothing else separates the candidates", () => {
    const existing = [
      entry({ id: "efetivado", settled: true }),
      entry({ id: "pendente", settled: false }),
    ]

    const result = matchOfxTransactions([movement({ fitId: "1", amountCents: -10000 })], existing)

    expect(result[0].matchedId).toBe("pendente")
    expect(result[0].kind).toBe("matches-pending")
  })
})

describe("isSelectedByDefault", () => {
  it("checks what adds something: a new lançamento or a pendente to efetivar", () => {
    expect(isSelectedByDefault("new")).toBe(true)
    expect(isSelectedByDefault("matches-pending")).toBe(true)
  })

  it("leaves the repeated ones unchecked — visible and reversible, never silently dropped", () => {
    expect(isSelectedByDefault("already-imported")).toBe(false)
    expect(isSelectedByDefault("already-settled")).toBe(false)
  })
})
