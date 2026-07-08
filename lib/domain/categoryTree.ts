import type { Category } from "@/lib/types"

export type CategoryTreeItem = { category: Category; depth: number }

/**
 * Orders categories for display in a flat list: each top-level category
 * immediately followed by its subcategories. Only two levels are supported
 * (a subcategory's own children, if any, are ignored) to match the single
 * "categoria pai" selector in the category form. Subcategories whose parent
 * is missing from the list (e.g. archived) are appended at depth 0 so they
 * are never silently dropped.
 */
export function flattenCategoryTree(categories: Category[]): CategoryTreeItem[] {
  const topLevel = categories.filter((c) => c.parentId === null)
  const topLevelIds = new Set(topLevel.map((c) => c.id))
  const orphans = categories.filter((c) => c.parentId !== null && !topLevelIds.has(c.parentId))

  const items: CategoryTreeItem[] = []
  for (const parent of topLevel) {
    items.push({ category: parent, depth: 0 })
    for (const child of categories.filter((c) => c.parentId === parent.id)) {
      items.push({ category: child, depth: 1 })
    }
  }
  for (const orphan of orphans) {
    items.push({ category: orphan, depth: 0 })
  }
  return items
}
