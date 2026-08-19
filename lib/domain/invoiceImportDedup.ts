/**
 * Flags imported fatura lines that are already on the invoice, so re-importing the
 * same statement doesn't duplicate everything that was imported last time.
 *
 * Matching is by count, not by mere existence: two identical purchases on the same
 * day are legitimate, so N stored copies only ever absorb N imported ones — the
 * (N+1)th is treated as new.
 */

export type DedupCandidate = {
  description: string
  amountCents: number
  date: string
}

/** Descriptions come from an AI read of the PDF and vary between runs
 *  ("CARREFOUR  SA" vs "Carrefour Sa"), so compare them loosely. Shared with the
 *  extrato import, where the bank's wording varies the same way. */
export function normalizeDescription(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function keyOf(item: DedupCandidate): string {
  return `${normalizeDescription(item.description)}|${item.amountCents}|${item.date}`
}

/**
 * Returns one flag per imported item, in the same order: `true` where that item is
 * already accounted for by an existing transaction on the invoice.
 */
export function markAlreadyImported(
  imported: DedupCandidate[],
  existing: DedupCandidate[]
): boolean[] {
  const remaining = new Map<string, number>()
  for (const item of existing) {
    const key = keyOf(item)
    remaining.set(key, (remaining.get(key) ?? 0) + 1)
  }

  return imported.map((item) => {
    const key = keyOf(item)
    const left = remaining.get(key) ?? 0
    if (left === 0) return false
    remaining.set(key, left - 1)
    return true
  })
}
