import { describe, expect, it } from "vitest"

import { FOCUS_PARAM, focusAnchorId, withFocus } from "@/lib/navigation/focus"

describe("withFocus", () => {
  it("points at one row", () => {
    expect(withFocus("/transacoes", ["tx1"])).toBe("/transacoes?foco=tx1")
  })

  it("points at every row of a group, so a duplicidade shows both entries", () => {
    expect(withFocus("/transacoes", ["tx1", "tx2"])).toBe("/transacoes?foco=tx1&foco=tx2")
  })

  it("leaves the path alone when there is nothing to point at", () => {
    expect(withFocus("/fluxo", [])).toBe("/fluxo")
    expect(withFocus("/fluxo", [""])).toBe("/fluxo")
  })

  it("keeps a query the path already had", () => {
    expect(withFocus("/transacoes?mes=2026-09", ["tx1"])).toBe("/transacoes?mes=2026-09&foco=tx1")
  })

  it("survives an id that would otherwise break the query", () => {
    const id = "a&b=c d"
    const parsed = new URLSearchParams(withFocus("/transacoes", [id]).split("?")[1])
    expect(parsed.getAll(FOCUS_PARAM)).toEqual([id])
  })
})

describe("focusAnchorId", () => {
  it("prefixes the id, so a date is not an element id on its own", () => {
    expect(focusAnchorId("2026-10-03")).toBe("foco-2026-10-03")
  })
})
