import { describe, expect, it } from "vitest"

import {
  annualCostCents,
  contractEvents,
  contractsNeedingAttention,
  describeIncrease,
  monthlyCostCents,
} from "./contractLifecycle"
import type { Contract } from "@/lib/types"

const TODAY = "2026-09-24"

function contract(overrides: Partial<Contract>): Contract {
  return {
    id: "c1",
    number: "001",
    contractor: "Ivan",
    contractee: "Vivo",
    scope: "Internet",
    startDate: "2026-01-10",
    endDate: "2027-01-10",
    executionDays: null,
    paymentMethod: "Débito",
    valueCents: 12000,
    notes: null,
    fileName: null,
    fileUrl: null,
    fileStoragePath: null,
    archived: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe("annualCostCents", () => {
  it("multiplies a monthly charge by twelve", () => {
    expect(annualCostCents(contract({ billingPeriod: "mensal", valueCents: 12000 }))).toBe(144000)
  })

  it("takes an annual charge as it is, and a quarterly one four times", () => {
    expect(annualCostCents(contract({ billingPeriod: "anual", valueCents: 120000 }))).toBe(120000)
    expect(annualCostCents(contract({ billingPeriod: "trimestral", valueCents: 30000 }))).toBe(120000)
  })

  it("gives no annual cost to a one-off contract", () => {
    expect(annualCostCents(contract({ billingPeriod: "unico", valueCents: 500000 }))).toBeNull()
  })

  it("gives none when the contract has no value", () => {
    expect(annualCostCents(contract({ valueCents: null }))).toBeNull()
  })

  it("puts an annual charge back into a monthly weight", () => {
    expect(monthlyCostCents(contract({ billingPeriod: "anual", valueCents: 120000 }))).toBe(10000)
  })
})

describe("contractEvents", () => {
  it("lists the start and the end, marking what has passed", () => {
    const events = contractEvents(contract({}), TODAY)

    expect(events.map((e) => e.kind)).toEqual(["inicio", "fim"])
    expect(events[0].past).toBe(true)
    expect(events[1].past).toBe(false)
  })

  it("calls the end a renewal when the contract renews itself", () => {
    const [, end] = contractEvents(contract({ autoRenew: true }), TODAY)

    expect(end.label).toBe("Renovação automática")
  })

  it("counts the cancellation notice back from the end", () => {
    const events = contractEvents(contract({ noticeDays: 30 }), TODAY)
    const notice = events.find((e) => e.kind === "aviso-cancelamento")!

    expect(notice.date).toBe("2026-12-11")
  })

  it("says how much the bill grows when the promotion ends", () => {
    const events = contractEvents(
      contract({ promoEndsAt: "2026-11-10", valueCents: 8000, postPromoValueCents: 12000 }),
      TODAY
    )
    const promo = events.find((e) => e.kind === "fim-promocao")!

    expect(promo.deltaCents).toBe(4000)
    expect(describeIncrease(promo)).toBe("aumenta a partir de novembro de 2026")
  })

  it("points the yearly adjustment at its next occurrence", () => {
    const events = contractEvents(contract({ adjustmentMonth: "03", adjustmentIndex: "IPCA" }), TODAY)
    const adjustment = events.find((e) => e.kind === "reajuste")!

    expect(adjustment.date).toBe("2027-03-10")
    expect(adjustment.label).toBe("Reajuste previsto (IPCA)")
  })

  it("keeps this year's adjustment while it is still ahead", () => {
    const events = contractEvents(contract({ adjustmentMonth: "11" }), TODAY)

    expect(events.find((e) => e.kind === "reajuste")!.date).toBe("2026-11-10")
  })
})

describe("contractsNeedingAttention", () => {
  it("lists what is coming, soonest first, and leaves the start out", () => {
    const attention = contractsNeedingAttention(
      [
        contract({ id: "longe", endDate: "2027-06-01" }),
        contract({ id: "perto", endDate: "2026-10-05", noticeDays: 0 }),
        contract({ id: "promo", endDate: "2027-05-01", promoEndsAt: "2026-10-20" }),
      ],
      TODAY
    )

    expect(attention.map((a) => a.contract.id)).toEqual(["perto", "promo"])
    expect(attention[0].inDays).toBe(11)
  })

  it("ignores archived contracts and dates already gone", () => {
    const attention = contractsNeedingAttention(
      [
        contract({ id: "arquivado", endDate: "2026-10-05", archived: true }),
        contract({ id: "vencido", endDate: "2026-08-05" }),
      ],
      TODAY
    )

    expect(attention).toEqual([])
  })
})
