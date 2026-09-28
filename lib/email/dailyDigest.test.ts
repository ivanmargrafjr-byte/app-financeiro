import { describe, expect, it } from "vitest"

import { cardCountsInMonth } from "@/lib/domain/cardCutoff"

/**
 * The digest runs against Firestore, so what is worth pinning here is the rule it
 * applies to each invoice — the one it used to skip, which is how a replaced card's
 * bill reached an inbox after the app had stopped showing it.
 */
function digestCountsInvoice(
  card: { archived?: boolean; archivedFromMonth?: string } | undefined,
  referenceMonth: string
): boolean {
  return cardCountsInMonth(
    card ? { archived: card.archived ?? false, archivedFromMonth: card.archivedFromMonth } : undefined,
    referenceMonth
  )
}

describe("which invoices the daily digest may announce", () => {
  it("announces an invoice of a card in use", () => {
    expect(digestCountsInvoice({ archived: false }, "2026-09")).toBe(true)
  })

  it("stays quiet about the months a replacement card already carries", () => {
    expect(digestCountsInvoice({ archived: true, archivedFromMonth: "2026-08" }, "2026-09")).toBe(false)
  })

  it("still announces the months that exist only on the old card", () => {
    expect(digestCountsInvoice({ archived: true, archivedFromMonth: "2026-10" }, "2026-09")).toBe(true)
  })

  it("announces an archived card with no cutoff, whose bill is still owed", () => {
    expect(digestCountsInvoice({ archived: true }, "2026-09")).toBe(true)
  })

  it("announces an invoice whose card is missing rather than swallowing it", () => {
    expect(digestCountsInvoice(undefined, "2026-09")).toBe(true)
  })
})
