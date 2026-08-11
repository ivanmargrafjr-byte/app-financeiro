import { describe, expect, it } from "vitest"
import { monthLabel } from "./dateUtils"

describe("monthLabel", () => {
  it("formats a valid month in pt-BR, capitalized", () => {
    expect(monthLabel("2026-08")).toBe("Agosto de 2026")
  })

  it("returns malformed values as-is instead of throwing", () => {
    // A rule stored with "2027/12" used to build an Invalid Date here and crash the
    // whole Recorrências page via Intl.format.
    expect(() => monthLabel("2027/12")).not.toThrow()
    expect(monthLabel("2027/12")).toBe("2027/12")
    expect(monthLabel("2026-13")).toBe("2026-13")
  })

  it("renders a dash for empty or missing values", () => {
    expect(monthLabel("")).toBe("—")
    expect(monthLabel(undefined as unknown as string)).toBe("—")
  })
})
