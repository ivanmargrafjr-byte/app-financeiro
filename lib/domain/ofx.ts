/**
 * Reads an OFX bank statement (extrato) into plain movements the app can import.
 *
 * OFX comes in two dialects and Brazilian banks ship both: version 1.x is SGML,
 * where tags are opened and never closed (`<FITID>123` ends at the line break),
 * and version 2.x is plain XML. Rather than branch on the header, every value is
 * read with a rule that fits both — stop at the first `<` or line break.
 *
 * The reason this format was chosen over reading a PDF with AI: each movement
 * carries `FITID`, an identifier the bank guarantees to be stable for that
 * account. Re-importing the same period can therefore be deduplicated exactly,
 * instead of guessing from description/amount/date the way the fatura import has
 * to (see lib/domain/invoiceImportDedup.ts).
 */

import type { DateString } from "@/lib/domain/dateUtils"

export type OfxTransaction = {
  /** The bank's own identifier for this movement — unique within the account. */
  fitId: string
  date: DateString
  /** Signed the way the bank reports it: negative when money left the account. */
  amountCents: number
  description: string
  /** TRNTYPE as sent (DEBIT, CREDIT, XFER, PAYMENT, FEE...); '' when absent. */
  type: string
}

export type OfxStatement = {
  bankId: string | null
  /** The account number the statement was exported from, when the file says. */
  accountId: string | null
  /** Closing balance the bank reports, for showing next to the import. */
  ledgerBalanceCents: number | null
  ledgerBalanceDate: DateString | null
  transactions: OfxTransaction[]
}

const STMTTRN_BLOCK = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi

/** The five entities OFX 1.x is allowed to escape, plus the XML apostrophe. */
function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
}

/**
 * Reads one tag out of a block. Stopping at `<` or the line break is what makes
 * this work for both dialects: in XML the value ends at `</TAG>`, in SGML at the
 * newline that the next tag starts after.
 */
function tagValue(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(block)
  if (!match) return null
  const value = decodeEntities(match[1]).trim()
  return value === "" ? null : value
}

/**
 * OFX stamps a full timestamp with a zone (`20260813120000[-3:BRT]`), but the app
 * keys everything off plain calendar dates. Only the date part is kept on purpose:
 * converting the timestamp would push a late-night lançamento to the next day for
 * anyone west of the bank's zone, which is exactly the off-by-one dateUtils exists
 * to avoid.
 */
export function parseOfxDate(raw: string): DateString | null {
  const digits = raw.trim().slice(0, 8)
  if (!/^\d{8}$/.test(digits)) return null

  const [year, month, day] = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
  if (Number(month) < 1 || Number(month) > 12) return null
  if (Number(day) < 1 || Number(day) > 31) return null

  return `${year}-${month}-${day}`
}

/**
 * The spec says amounts use a dot and no thousands separator, but exports in the
 * wild do use a comma, so both are accepted under the same rule the app already
 * applies to typed input (money.ts): with both separators present the comma is
 * the decimal one.
 *
 * The conversion goes through strings rather than `Number(x) * 100` because the
 * float round-trip loses a cent on some values (`19.99 * 100` is 1998.9999…),
 * and a statement of a few hundred lines would drift.
 */
export function parseOfxAmountCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "")
  if (!/\d/.test(cleaned)) return null

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned
  if (!/^[+-]?\d*\.?\d*$/.test(normalized)) return null

  const negative = normalized.startsWith("-")
  const [intPart, fracPart = ""] = normalized.replace(/^[+-]/, "").split(".")
  const cents = Number(intPart || "0") * 100 + Number((fracPart + "00").slice(0, 2))

  return negative ? -cents : cents
}

/**
 * Decodes the raw bytes of an uploaded .ofx file.
 *
 * Brazilian banks export OFX 1.x as windows-1252, and reading it as UTF-8 turns
 * every accented description into replacement characters. The header declares the
 * charset and is ASCII either way, so it is safe to sniff with a 1252 pass first.
 */
export function decodeOfxBytes(bytes: ArrayBuffer): string {
  const sniffed = new TextDecoder("windows-1252").decode(bytes)
  const isUtf8 = /(?:encoding|charset)\s*[:=]\s*"?utf-?8/i.test(sniffed.slice(0, 1024))
  return isUtf8 ? new TextDecoder("utf-8").decode(bytes) : sniffed
}

/**
 * Parses an OFX statement. Movements missing an id, a readable date or a readable
 * amount are dropped rather than guessed at: without a FITID there is no reliable
 * dedup, and a lançamento with the wrong date or value is worse than a missing one.
 *
 * Throws when the content isn't OFX at all, so the caller can say so instead of
 * reporting an empty statement.
 */
export function parseOfx(content: string): OfxStatement {
  if (!/<OFX>/i.test(content)) {
    throw new Error("Este arquivo não parece ser um extrato OFX")
  }

  const transactions: OfxTransaction[] = []
  for (const [, block] of content.matchAll(STMTTRN_BLOCK)) {
    const fitId = tagValue(block, "FITID")
    const rawDate = tagValue(block, "DTPOSTED")
    const rawAmount = tagValue(block, "TRNAMT")
    if (!fitId || !rawDate || !rawAmount) continue

    const date = parseOfxDate(rawDate)
    const amountCents = parseOfxAmountCents(rawAmount)
    if (!date || amountCents === null) continue

    // MEMO carries the description a person recognises ("PIX ENVIADO JOAO");
    // NAME is often just the counterparty, and some banks fill only one of them.
    const description = tagValue(block, "MEMO") ?? tagValue(block, "NAME") ?? "Lançamento"

    transactions.push({
      fitId,
      date,
      amountCents,
      description,
      type: tagValue(block, "TRNTYPE") ?? "",
    })
  }

  const rawLedger = tagValue(content, "BALAMT")
  const rawLedgerDate = tagValue(content, "DTASOF")

  return {
    bankId: tagValue(content, "BANKID"),
    accountId: tagValue(content, "ACCTID"),
    ledgerBalanceCents: rawLedger ? parseOfxAmountCents(rawLedger) : null,
    ledgerBalanceDate: rawLedgerDate ? parseOfxDate(rawLedgerDate) : null,
    transactions,
  }
}
