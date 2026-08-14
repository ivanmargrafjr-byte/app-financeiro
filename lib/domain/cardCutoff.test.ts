import { describe, expect, it } from "vitest"

import { cardCountsInMonth, type CardCutoff } from "./cardCutoff"

const active: CardCutoff = { archived: false }
const replacedInAugust: CardCutoff = { archived: true, archivedFromMonth: "2026-08" }

describe("cardCountsInMonth", () => {
  it("counts an active card in any month", () => {
    expect(cardCountsInMonth(active, "2026-07")).toBe(true)
    expect(cardCountsInMonth(active, "2026-08")).toBe(true)
  })

  it("still counts the archived card before the replacement took over", () => {
    // July exists only on the old card — dropping it would erase real spending.
    expect(cardCountsInMonth(replacedInAugust, "2026-07")).toBe(true)
  })

  it("stops counting from the cutoff month on", () => {
    expect(cardCountsInMonth(replacedInAugust, "2026-08")).toBe(false)
    expect(cardCountsInMonth(replacedInAugust, "2026-09")).toBe(false)
  })

  it("counts an archived card that has no cutoff set", () => {
    // Adding the field must not retroactively change totals that were already right.
    expect(cardCountsInMonth({ archived: true }, "2026-08")).toBe(true)
  })

  it("counts a card it doesn't know about rather than dropping its entries", () => {
    expect(cardCountsInMonth(undefined, "2026-08")).toBe(true)
  })

  it("compares months as calendar months, not string length", () => {
    const cutoffInNewYear: CardCutoff = { archived: true, archivedFromMonth: "2027-01" }

    expect(cardCountsInMonth(cutoffInNewYear, "2026-12")).toBe(true)
    expect(cardCountsInMonth(cutoffInNewYear, "2027-01")).toBe(false)
  })
})
