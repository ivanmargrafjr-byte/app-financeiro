import "server-only"
import { PDFDocument } from "pdf-lib"

/**
 * Pages per extraction call. A long fatura can't be read in one request — the model
 * call outruns the route's 60s budget — so it's split and the chunks are read in
 * parallel. Small enough that one chunk comfortably fits the budget, large enough
 * that a typical 2–4 page fatura still goes out as a single call.
 */
export const PAGES_PER_CHUNK = 3

/**
 * Splits a PDF into base64 chunks of at most `PAGES_PER_CHUNK` pages each, in page
 * order. Returns a single chunk (the original data) when the PDF is short enough or
 * can't be parsed — callers treat "one chunk" as the ordinary single-request path.
 */
export async function splitPdfIntoChunks(base64Data: string): Promise<string[]> {
  let source: PDFDocument
  try {
    source = await PDFDocument.load(Buffer.from(base64Data, "base64"), {
      // Statements are often password-protected for viewing; the bytes are still
      // readable, and failing here would block an import that would otherwise work.
      ignoreEncryption: true,
    })
  } catch {
    return [base64Data]
  }

  const pageCount = source.getPageCount()
  if (pageCount <= PAGES_PER_CHUNK) return [base64Data]

  const chunks: string[] = []
  for (let start = 0; start < pageCount; start += PAGES_PER_CHUNK) {
    const indices = Array.from(
      { length: Math.min(PAGES_PER_CHUNK, pageCount - start) },
      (_, i) => start + i
    )
    const chunk = await PDFDocument.create()
    const pages = await chunk.copyPages(source, indices)
    pages.forEach((page) => chunk.addPage(page))
    chunks.push(Buffer.from(await chunk.save()).toString("base64"))
  }

  return chunks
}
