import { describe, expect, it } from "vitest"

import { isMonthScopedRoute } from "./monthScopedRoutes"

describe("isMonthScopedRoute", () => {
  it("keeps the switcher on the screens built around a month", () => {
    expect(isMonthScopedRoute("/inicio")).toBe(true)
    expect(isMonthScopedRoute("/dashboard")).toBe(true)
    expect(isMonthScopedRoute("/transacoes")).toBe(true)
  })

  it("drops it where the content is the same in any month", () => {
    for (const route of [
      "/contas",
      "/cartoes",
      "/recorrentes",
      "/categorias",
      "/contratos",
      "/conta",
      "/admin",
      "/assinatura",
    ]) {
      expect(isMonthScopedRoute(route)).toBe(false)
    }
  })

  it("drops it on a card's invoices, which are listed in full", () => {
    expect(isMonthScopedRoute("/cartoes/abc123")).toBe(false)
    expect(isMonthScopedRoute("/cartoes/abc123/faturas/inv1")).toBe(false)
  })

  it("does not mistake a route that merely starts with the same letters", () => {
    expect(isMonthScopedRoute("/dashboards-antigos")).toBe(false)
  })
})
