import "server-only"
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"

import { anthropic } from "@/lib/anthropic/client"

const extractedReceiptSchema = z.object({
  description: z
    .string()
    .nullable()
    .describe("Nome do estabelecimento/loja ou uma descrição curta da compra"),
  amount: z.number().nullable().describe("Valor total pago, em reais (sem separador de milhar)"),
  date: z.string().nullable().describe("Data da compra, no formato YYYY-MM-DD"),
})

export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

export async function extractReceipt(
  base64Data: string,
  mediaType: string
): Promise<ExtractedReceipt> {
  const isPdf = mediaType === "application/pdf"

  const message = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 1024,
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
                source: {
                  type: "base64",
                  media_type: mediaType as ImageMediaType,
                  data: base64Data,
                },
              },
          {
            type: "text",
            text: "Extraia os dados desta compra/recibo de cartão de crédito: o nome do estabelecimento (como descrição), o valor total pago e a data da compra. Se um campo não estiver visível ou não puder ser determinado com confiança, retorne null para ele.",
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(extractedReceiptSchema),
    },
  })

  if (!message.parsed_output) {
    throw new Error("Não foi possível extrair os dados do recibo")
  }

  return message.parsed_output
}
