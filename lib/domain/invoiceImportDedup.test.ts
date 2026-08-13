import { describe, expect, it } from "vitest"

import { markAlreadyImported, type DedupCandidate } from "./invoiceImportDedup"

const item = (description: string, amountCents: number, date = "2026-08-10"): DedupCandidate => ({
  description,
  amountCents,
  date,
})

describe("markAlreadyImported", () => {
  it("flags a line that is already on the invoice", () => {
    const existing = [item("Carrefour", 12950)]

    expect(markAlreadyImported([item("Carrefour", 12950)], existing)).toEqual([true])
  })

  it("treats a line the invoice doesn't have as new", () => {
    const existing = [item("Carrefour", 12950)]

    expect(markAlreadyImported([item("Posto Shell", 20000)], existing)).toEqual([false])
  })

  it("matches despite the casing and spacing an AI read varies between runs", () => {
    const existing = [item("CARREFOUR  SA", 12950)]

    expect(markAlreadyImported([item("Carrefour Sa", 12950)], existing)).toEqual([true])
  })

  it("matches despite accents", () => {
    const existing = [item("Farmácia", 5000)]

    expect(markAlreadyImported([item("FARMACIA", 5000)], existing)).toEqual([true])
  })

  it("does not match when the amount differs", () => {
    const existing = [item("Carrefour", 12950)]

    expect(markAlreadyImported([item("Carrefour", 12951)], existing)).toEqual([false])
  })

  it("does not match when the date differs", () => {
    const existing = [item("Carrefour", 12950, "2026-08-10")]

    expect(markAlreadyImported([item("Carrefour", 12950, "2026-08-11")], existing)).toEqual([false])
  })

  describe("two genuinely identical purchases stay two", () => {
    it("keeps the second copy when the invoice only holds one", () => {
      const existing = [item("Café", 800)]
      const imported = [item("Café", 800), item("Café", 800)]

      // One is absorbed by what's stored; the other is a real second purchase.
      expect(markAlreadyImported(imported, existing)).toEqual([true, false])
    })

    it("absorbs both when the invoice already holds both", () => {
      const existing = [item("Café", 800), item("Café", 800)]
      const imported = [item("Café", 800), item("Café", 800)]

      expect(markAlreadyImported(imported, existing)).toEqual([true, true])
    })

    it("flags nothing on a first import into an empty invoice", () => {
      const imported = [item("Café", 800), item("Café", 800)]

      expect(markAlreadyImported(imported, [])).toEqual([false, false])
    })
  })
})
