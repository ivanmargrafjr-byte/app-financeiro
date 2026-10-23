/** The 44-digit NF-e access key, stripped of the spaces and dots it is printed with. Null when it isn't one. */
export function normalizeAccessKey(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "")
  return digits.length === 44 ? digits : null
}

/** The key as the DANFE prints it: eleven groups of four digits. */
export function formatAccessKey(key: string): string {
  return key.replace(/(\d{4})(?=\d)/g, "$1 ")
}
