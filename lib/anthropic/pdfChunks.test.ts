// @vitest-environment node
// Runs in node, like the route does: pdf-lib type-checks its input against
// Uint8Array, and jsdom's separate realm makes a Node Buffer fail that check.
import { describe, expect, it, vi } from "vitest"
import { PDFDocument } from "pdf-lib"

// The module is server-only; the guard throws under the jsdom test environment.
vi.mock("server-only", () => ({}))

const { splitPdfIntoChunks, PAGES_PER_CHUNK } = await import("./pdfChunks")

async function pdfWithPages(count: number): Promise<string> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < count; i++) doc.addPage([300, 200])
  return Buffer.from(await doc.save()).toString("base64")
}

async function pageCountOf(base64: string): Promise<number> {
  return (await PDFDocument.load(Buffer.from(base64, "base64"))).getPageCount()
}

describe("splitPdfIntoChunks", () => {
  it("leaves a short fatura as a single call", async () => {
    const pdf = await pdfWithPages(PAGES_PER_CHUNK)
    const chunks = await splitPdfIntoChunks(pdf)

    expect(chunks).toEqual([pdf])
  })

  it("splits a long fatura into page-bounded chunks", async () => {
    const chunks = await splitPdfIntoChunks(await pdfWithPages(10))

    expect(chunks).toHaveLength(Math.ceil(10 / PAGES_PER_CHUNK))
    for (const chunk of chunks) {
      expect(await pageCountOf(chunk)).toBeLessThanOrEqual(PAGES_PER_CHUNK)
    }
  })

  it("preserves every page exactly once, so no lançamento is lost or duplicated", async () => {
    const chunks = await splitPdfIntoChunks(await pdfWithPages(10))

    const total = (await Promise.all(chunks.map(pageCountOf))).reduce((a, b) => a + b, 0)
    expect(total).toBe(10)
  })

  it("falls back to one call when the file can't be parsed as a PDF", async () => {
    const junk = Buffer.from("not a pdf").toString("base64")

    await expect(splitPdfIntoChunks(junk)).resolves.toEqual([junk])
  })
})
