import { describe, expect, it } from "vitest"
import { flattenCategoryTree } from "./categoryTree"
import type { Category } from "@/lib/types"

function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: "id",
    name: "name",
    type: "despesa",
    icon: "Tag",
    color: "#000000",
    archived: false,
    isDefault: false,
    parentId: null,
    ...overrides,
  }
}

describe("flattenCategoryTree", () => {
  it("places each subcategory right after its parent", () => {
    const transporte = makeCategory({ id: "transporte", name: "Transporte" })
    const combustivel = makeCategory({ id: "combustivel", name: "Combustível", parentId: "transporte" })
    const mercado = makeCategory({ id: "mercado", name: "Mercado" })

    const result = flattenCategoryTree([transporte, combustivel, mercado])

    expect(result.map((r) => r.category.id)).toEqual(["transporte", "combustivel", "mercado"])
    expect(result.map((r) => r.depth)).toEqual([0, 1, 0])
  })

  it("appends orphaned subcategories (missing parent) at depth 0 instead of dropping them", () => {
    const orphan = makeCategory({ id: "orphan", name: "Orphan", parentId: "missing-parent" })

    const result = flattenCategoryTree([orphan])

    expect(result).toEqual([{ category: orphan, depth: 0 }])
  })

  it("returns an empty list for no categories", () => {
    expect(flattenCategoryTree([])).toEqual([])
  })
})
