import { describe, expect, it } from "vitest"

import { formatAccessKey, normalizeAccessKey } from "@/lib/domain/fiscalNote"

const KEY = "35260112345678000195550010000012341000012340"

describe("normalizeAccessKey", () => {
  it("keeps a clean 44-digit key", () => {
    expect(normalizeAccessKey(KEY)).toBe(KEY)
  })

  it("strips the spaces and dots a DANFE prints between groups", () => {
    expect(normalizeAccessKey(formatAccessKey(KEY))).toBe(KEY)
    expect(normalizeAccessKey(KEY.replace(/(\d{4})/g, "$1.").slice(0, -1))).toBe(KEY)
  })

  it("rejects anything that is not 44 digits", () => {
    expect(normalizeAccessKey("1234")).toBeNull()
    expect(normalizeAccessKey("")).toBeNull()
    expect(normalizeAccessKey(null)).toBeNull()
  })
})

describe("formatAccessKey", () => {
  it("groups the key in fours", () => {
    expect(formatAccessKey(KEY).split(" ")).toHaveLength(11)
  })
})
