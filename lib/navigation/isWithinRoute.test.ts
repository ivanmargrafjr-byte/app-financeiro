import { describe, expect, it } from "vitest"

import { isWithinRoute } from "./isWithinRoute"

describe("isWithinRoute", () => {
  it("matches the route itself", () => {
    expect(isWithinRoute("/contas", "/contas")).toBe(true)
  })

  it("matches the pages under it", () => {
    expect(isWithinRoute("/contas/abc123", "/contas")).toBe(true)
    expect(isWithinRoute("/cartoes/abc/faturas/inv1", "/cartoes")).toBe(true)
  })

  it("does not light up Conta while Contas is open", () => {
    expect(isWithinRoute("/contas", "/conta")).toBe(false)
    expect(isWithinRoute("/contas/abc123", "/conta")).toBe(false)
  })

  it("still lights up Conta on its own page", () => {
    expect(isWithinRoute("/conta", "/conta")).toBe(true)
  })
})
