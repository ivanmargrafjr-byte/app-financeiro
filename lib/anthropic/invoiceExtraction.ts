import "server-only"
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"

import { anthropic } from "@/lib/anthropic/client"
import { splitPdfIntoChunks } from "@/lib/anthropic/pdfChunks"

const extractedInvoiceLineItemSchema = z.object({
  description: z.string().describe("Descrição do lançamento / nome do estabelecimento"),
  amount: z.number().describe("Valor do lançamento em reais (sem separador de milhar)"),
  date: z
    .string()
    .nullable()
    .describe("Data da compra no formato YYYY-MM-DD, se estiver visível na fatura"),
  installmentNumber: z
    .number()
    .int()
    .nullable()
    .describe("Número da parcela atual, se for uma compra parcelada (ex: 3 em '3/12')"),
  installmentTotal: z
    .number()
    .int()
    .nullable()
    .describe("Total de parcelas, se for uma compra parcelada (ex: 12 em '3/12')"),
})

const extractedInvoiceSchema = z.object({
  items: z.array(extractedInvoiceLineItemSchema),
})

export type ExtractedInvoiceLineItem = z.infer<typeof extractedInvoiceLineItemSchema>

type FileMediaType = "application/pdf" | "image/jpeg" | "image/png" | "image/gif" | "image/webp"

/**
 * Extracts every purchase line item from a card statement (PDF or photo/screenshot).
 * `referenceMonthHint` (YYYY-MM) is the invoice cycle being imported into — passed so
 * the model can resolve dates that only show day/month on the statement, and so it
 * understands which billing cycle it's looking at.
 */
export async function extractInvoiceLineItems(
  base64Data: string,
  mediaType: FileMediaType,
  referenceMonthHint: string
): Promise<ExtractedInvoiceLineItem[]> {
  if (mediaType !== "application/pdf") {
    return extractFromDocument(base64Data, mediaType, referenceMonthHint)
  }

  // A long fatura can't be read in a single call within the route's time budget, so
  // it's split by page and the chunks are read concurrently — wall-clock is then the
  // slowest chunk rather than the sum. Page boundaries are safe split points: a line
  // item belongs to exactly one page, so nothing is double-counted or dropped.
  const chunks = await splitPdfIntoChunks(base64Data)
  // Without this, a timeout tells us nothing about where the budget went: whether the
  // split happened at all, how many calls it became, and which one was the long pole.
  console.info(
    `[invoiceExtraction] pdf ${Math.round(base64Data.length / 1024)}KB -> ${chunks.length} chunk(s)`
  )
  if (chunks.length === 1) {
    return extractFromDocument(base64Data, mediaType, referenceMonthHint)
  }

  const perChunk = await mapWithConcurrency(chunks, MAX_PARALLEL_CHUNKS, async (chunk, i) => {
    const startedAt = Date.now()
    const items = await extractFromDocument(chunk, mediaType, referenceMonthHint)
    console.info(
      `[invoiceExtraction] chunk ${i + 1}/${chunks.length}: ${items.length} item(s) in ${Date.now() - startedAt}ms`
    )
    return items
  })
  return perChunk.flat()
}

/**
 * Caps how many chunk extractions are in flight at once. Firing every chunk of a very
 * long statement at the same time risks rate-limiting the whole import; a handful in
 * parallel already collapses the wall-clock enough to fit the route's budget.
 */
const MAX_PARALLEL_CHUNKS = 5

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await run(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function extractFromDocument(
  base64Data: string,
  mediaType: FileMediaType,
  referenceMonthHint: string
): Promise<ExtractedInvoiceLineItem[]> {
  const isPdf = mediaType === "application/pdf"

  const message = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    // A fatura with hundreds of purchases can outgrow a small cap mid-JSON, which
    // fails the structured-output parse and reads to the user as "couldn't read it".
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: [
          isPdf
            ? {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64Data },
              }
            : {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              },
          {
            type: "text",
            text: `Extraia todos os lançamentos (compras) desta fatura de cartão de crédito, um por um. Esta fatura se refere ao ciclo de ${referenceMonthHint}. Para cada lançamento, identifique: descrição/estabelecimento, valor em reais, a data da compra (se visível, no formato YYYY-MM-DD — use o ano do ciclo ${referenceMonthHint} ao completar datas que só mostram dia/mês) e, se for uma compra parcelada (algo como "3/12" ou "PARC 03/12" na descrição), o número da parcela atual e o total de parcelas. Inclua APENAS lançamentos individuais de compras/despesas — não inclua o total da fatura, pagamento mínimo, pagamentos/créditos anteriores, juros ou encargos financeiros.`,
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(extractedInvoiceSchema),
      // Transcribing line items is mechanical work, and this call has to finish
      // inside the route's 60s budget — low effort is both faster and enough here.
      effort: "low",
    },
  })

  if (!message.parsed_output) {
    throw new Error("Não foi possível extrair os dados da fatura")
  }

  return message.parsed_output.items
}
