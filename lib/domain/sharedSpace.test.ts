import { describe, expect, it } from "vitest"

import {
  balances,
  settleUp,
  splitByWeight,
  splitEqually,
  type SharedExpense,
  type Settlement,
} from "./sharedSpace"

const UIDS = ["ana", "bruno", "clara"]

function expense(overrides: Partial<SharedExpense>): SharedExpense {
  return {
    id: "e1",
    description: "Mercado",
    amountCents: 30000,
    date: "2026-09-10",
    paidByUid: "ana",
    splitCentsByUid: splitEqually(30000, UIDS),
    createdByUid: "ana",
    createdAt: 0,
    ...overrides,
  }
}

describe("splitEqually", () => {
  it("leaves no cent behind", () => {
    const split = splitEqually(1000, UIDS)

    expect(Object.values(split)).toEqual([334, 333, 333])
    expect(Object.values(split).reduce((a, b) => a + b, 0)).toBe(1000)
  })
})

describe("splitByWeight", () => {
  it("divides in proportion, still to the exact total", () => {
    const split = splitByWeight(90000, { ana: 2, bruno: 1 })

    expect(split).toEqual({ ana: 60000, bruno: 30000 })
  })

  it("gives the rounding leftovers to whoever pays more", () => {
    const split = splitByWeight(1000, { ana: 2, bruno: 1 })

    expect(split.ana + split.bruno).toBe(1000)
    expect(split.ana).toBe(667)
  })

  it("falls back to equal shares when every weight is zero", () => {
    expect(splitByWeight(900, { ana: 0, bruno: 0 })).toEqual({ ana: 450, bruno: 450 })
  })
})

describe("balances", () => {
  it("separates who paid from who consumed", () => {
    const result = balances([expense({})], [], UIDS)

    expect(result).toEqual([
      { uid: "ana", cents: 20000 },
      { uid: "bruno", cents: -10000 },
      { uid: "clara", cents: -10000 },
    ])
  })

  it("does not let a reimbursement erase the expense", () => {
    const settlement: Settlement = {
      id: "s1",
      fromUid: "bruno",
      toUid: "ana",
      amountCents: 10000,
      date: "2026-09-12",
      createdAt: 0,
    }
    const result = balances([expense({})], [settlement], UIDS)

    expect(result.find((b) => b.uid === "bruno")!.cents).toBe(0)
    expect(result.find((b) => b.uid === "ana")!.cents).toBe(10000)
  })

  it("ignores someone who is no longer in the space", () => {
    const result = balances(
      [expense({ splitCentsByUid: { ana: 10000, bruno: 10000, saiu: 10000 } })],
      [],
      ["ana", "bruno"]
    )

    expect(result.map((b) => b.uid)).toEqual(["ana", "bruno"])
  })

  it("adds up to zero across everyone", () => {
    const result = balances([expense({}), expense({ id: "e2", paidByUid: "bruno" })], [], UIDS)

    expect(result.reduce((sum, b) => sum + b.cents, 0)).toBe(0)
  })
})

describe("settleUp", () => {
  it("settles a group with fewer transfers than people", () => {
    const transfers = settleUp([
      { uid: "ana", cents: 20000 },
      { uid: "bruno", cents: -10000 },
      { uid: "clara", cents: -10000 },
    ])

    expect(transfers).toHaveLength(2)
    expect(transfers).toContainEqual({ fromUid: "bruno", toUid: "ana", cents: 10000 })
    expect(transfers).toContainEqual({ fromUid: "clara", toUid: "ana", cents: 10000 })
  })

  it("does not ask for a transfer when everyone is square", () => {
    expect(settleUp([{ uid: "ana", cents: 0 }, { uid: "bruno", cents: 0 }])).toEqual([])
  })

  it("breaks a circle into direct payments", () => {
    const transfers = settleUp([
      { uid: "ana", cents: -15000 },
      { uid: "bruno", cents: 5000 },
      { uid: "clara", cents: 10000 },
    ])

    expect(transfers).toHaveLength(2)
    expect(transfers.every((t) => t.fromUid === "ana")).toBe(true)
    expect(transfers.reduce((sum, t) => sum + t.cents, 0)).toBe(15000)
  })
})
