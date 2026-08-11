import "server-only"
import { PDFDocument } from "pdf-lib"

/**
 * Pages per extraction call. What blows the route's time budget is how much the model
 * has to *write*, not the file size: a single dense page of purchases is thousands of
 * output tokens. Measured on a real fatura, a 3-page chunk never finished inside 60s
 * while a near-empty one took 3s — so chunk one page at a time and lean on the
 * concurrency below to keep wall-clock at roughly the slowest single page.
 */
export const PAGES_PER_CHUNK = 1

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
  } catch (error) {
    // Falling back to one call is the right behaviour, but silently doing so turns an
    // unsplittable PDF into an unexplained timeout — say why.
    console.warn("[pdfChunks] could not parse PDF, reading it in one call:", error)
    return [base64Data]
  }

  const pageCount = source.getPageCount()
  console.info(`[pdfChunks] ${pageCount} page(s)`)
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
