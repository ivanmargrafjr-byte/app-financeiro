import "server-only"
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"

import { anthropic } from "@/lib/anthropic/client"

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
  const isPdf = mediaType === "application/pdf"

  const message = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 8192,
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
    },
  })

  if (!message.parsed_output) {
    throw new Error("Não foi possível extrair os dados da fatura")
  }

  return message.parsed_output.items
}
