import { describe, expect, it } from "vitest"

import { suggestCategoryId, type CategorizedEntry } from "./categorySuggestion"

const past = (
  description: string,
  categoryId: string,
  overrides: Partial<CategorizedEntry> = {}
): CategorizedEntry => ({
  description,
  categoryId,
  direction: "out",
  createdAt: 1,
  ...overrides,
})

describe("suggestCategoryId", () => {
  it("suggests nothing when there is no history to learn from", () => {
    expect(suggestCategoryId("CARREFOUR", "out", [])).toBeNull()
  })

  it("reuses the category of an identical description", () => {
    const history = [past("Carrefour", "mercado")]

    expect(suggestCategoryId("CARREFOUR", "out", history)).toBe("mercado")
  })

  it("recognises the shop inside the bank's longer wording", () => {
    const history = [past("Carrefour", "mercado")]

    expect(suggestCategoryId("COMPRA CARTAO CARREFOUR SA", "out", history)).toBe("mercado")
  })

  it("ignores the words that only say how the money moved", () => {
    // Both are PIX; only the counterparty should decide the category.
    const history = [past("PIX ENVIADO PADARIA CENTRAL", "alimentacao")]

    expect(suggestCategoryId("PIX ENVIADO OFICINA MECANICA", "out", history)).toBeNull()
  })

  it("still matches when the shared part is the counterparty", () => {
    const history = [past("PIX ENVIADO PADARIA CENTRAL", "alimentacao")]

    expect(suggestCategoryId("PIX PADARIA CENTRAL", "out", history)).toBe("alimentacao")
  })

  it("does not give a credit the category of a lookalike despesa", () => {
    const history = [past("Carrefour", "mercado")]

    expect(suggestCategoryId("ESTORNO CARREFOUR", "in", history)).toBeNull()
  })

  it("follows the most recent choice when the user reclassified something", () => {
    const history = [
      past("Uber", "transporte", { createdAt: 10 }),
      past("Uber", "viagens", { createdAt: 20 }),
    ]

    expect(suggestCategoryId("UBER", "out", history)).toBe("viagens")
  })

  it("weighs repeated evidence over a single close line", () => {
    const history = [
      past("Posto Ipiranga Centro", "combustivel"),
      past("Posto Ipiranga Sul", "combustivel"),
      past("Posto Ipiranga", "veiculo", { createdAt: 5 }),
    ]

    expect(suggestCategoryId("POSTO IPIRANGA NORTE", "out", history)).toBe("combustivel")
  })

  it("suggests nothing when a single generic word is all that agrees", () => {
    const history = [past("Restaurante Sao Jorge", "alimentacao")]

    expect(suggestCategoryId("Farmacia Sao Joao", "out", history)).toBeNull()
  })

  it("suggests nothing for a description with no meaningful word at all", () => {
    const history = [past("Carrefour", "mercado")]

    expect(suggestCategoryId("TED 341 00012345", "out", history)).toBeNull()
  })

  it("ignores past lançamentos that were never categorised", () => {
    const history = [past("Carrefour", "")]

    expect(suggestCategoryId("CARREFOUR", "out", history)).toBeNull()
  })
})
