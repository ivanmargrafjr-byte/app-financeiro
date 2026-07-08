import "server-only"
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"

import { anthropic } from "@/lib/anthropic/client"

const extractedContractSchema = z.object({
  number: z.string().nullable().describe("Número/identificação do contrato"),
  contractor: z.string().nullable().describe("Nome do contratante (quem contrata o serviço)"),
  contractee: z.string().nullable().describe("Nome do contratado (quem presta o serviço)"),
  scope: z.string().nullable().describe("Objeto/escopo do contrato, resumido"),
  startDate: z.string().nullable().describe("Data de início da vigência, no formato YYYY-MM-DD"),
  endDate: z.string().nullable().describe("Data de término da vigência, no formato YYYY-MM-DD"),
  executionDays: z.number().int().nullable().describe("Prazo de execução em dias corridos, se informado"),
  paymentMethod: z.string().nullable().describe("Forma de pagamento descrita no contrato"),
  value: z.number().nullable().describe("Valor total do contrato em reais (sem separador de milhar)"),
})

export type ExtractedContract = z.infer<typeof extractedContractSchema>

export async function extractContractFromPdf(base64Pdf: string): Promise<ExtractedContract> {
  const message = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Pdf,
            },
          },
          {
            type: "text",
            text: "Extraia as informações principais deste contrato. Se um campo não estiver presente ou não puder ser determinado com confiança, retorne null para ele.",
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(extractedContractSchema),
    },
  })

  if (!message.parsed_output) {
    throw new Error("Não foi possível extrair os dados do contrato")
  }

  return message.parsed_output
}
