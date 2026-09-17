import { describe, expect, it } from "vitest"
import { dateStringFromMillis, monthLabel } from "./dateUtils"

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

describe("dateStringFromMillis", () => {
  it("gives the local calendar day of a timestamp", () => {
    const noon = new Date(2026, 8, 24, 12, 0, 0).getTime()
    expect(dateStringFromMillis(noon)).toBe("2026-09-24")
  })

  it("keeps the day the clock shows late at night, not the UTC one", () => {
    const lateNight = new Date(2026, 8, 24, 23, 30, 0).getTime()
    expect(dateStringFromMillis(lateNight)).toBe("2026-09-24")
  })
})
