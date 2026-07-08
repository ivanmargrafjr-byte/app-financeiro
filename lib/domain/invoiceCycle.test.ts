import { describe, expect, it } from "vitest"
import {
  computeClosingDate,
  computeDueDate,
  resolveInvoiceCycleForPurchase,
  referenceMonthForInstallment,
  invoiceDocId,
} from "./invoiceCycle"

describe("computeClosingDate", () => {
  it("clamps closing day 31 to the last day of February (non-leap year)", () => {
    expect(computeClosingDate("2026-02", 31)).toBe("2026-02-28")
  })

  it("clamps closing day 31 to Feb 29 on a leap year", () => {
    expect(computeClosingDate("2028-02", 31)).toBe("2028-02-29")
  })

  it("uses the day directly for a normal month", () => {
    expect(computeClosingDate("2026-07", 25)).toBe("2026-07-25")
  })
})

describe("computeDueDate", () => {
  it("rolls the due date to the next month when dueDay <= closingDay (common case)", () => {
    expect(computeDueDate("2026-07", 25, 5)).toBe("2026-08-05")
  })

  it("keeps the due date in the same month when dueDay > closingDay (rare case)", () => {
    expect(computeDueDate("2026-07", 5, 15)).toBe("2026-07-15")
  })

  it("clamps the due day for short months", () => {
    expect(computeDueDate("2026-01", 31, 5)).toBe("2026-02-05")
  })
})

describe("resolveInvoiceCycleForPurchase", () => {
  const card = { closingDay: 25, dueDay: 5 }

  it("assigns a purchase before the closing day to the current month's cycle", () => {
    expect(resolveInvoiceCycleForPurchase("2026-07-10", card)).toBe("2026-07")
  })

  it("assigns a purchase ON the closing day to the current month's cycle (inclusive)", () => {
    expect(resolveInvoiceCycleForPurchase("2026-07-25", card)).toBe("2026-07")
  })

  it("assigns a purchase after the closing day to the next month's cycle", () => {
    expect(resolveInvoiceCycleForPurchase("2026-07-26", card)).toBe("2026-08")
  })

  it("handles a closing day beyond a short month's length (Feb)", () => {
    const shortCard = { closingDay: 30, dueDay: 5 }
    // Feb 2026 has 28 days -> effective closing day is 28
    expect(resolveInvoiceCycleForPurchase("2026-02-28", shortCard)).toBe("2026-02")
    expect(resolveInvoiceCycleForPurchase("2026-03-01", shortCard)).toBe("2026-03")
  })

  it("rolls a December purchase into January of the next year", () => {
    expect(resolveInvoiceCycleForPurchase("2026-12-30", card)).toBe("2027-01")
  })
})

describe("referenceMonthForInstallment", () => {
  it("keeps installment 1 on the first cycle", () => {
    expect(referenceMonthForInstallment("2026-07", 1)).toBe("2026-07")
  })

  it("rolls installment n forward n-1 months, crossing a year boundary", () => {
    expect(referenceMonthForInstallment("2026-11", 3)).toBe("2027-01")
  })
})

describe("invoiceDocId", () => {
  it("builds a deterministic id from cardId and referenceMonth", () => {
    expect(invoiceDocId("card123", "2026-07")).toBe("card123_2026-07")
  })
})
