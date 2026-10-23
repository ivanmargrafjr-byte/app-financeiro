import "server-only"
import { z } from "zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"

import { anthropic } from "@/lib/anthropic/client"

const extractedFiscalNoteSchema = z.object({
  kind: z
    .enum(["produto", "servico", "outra"])
    .nullable()
    .describe(
      "Tipo da nota: 'produto' para NF-e/DANFE (mercadorias), 'servico' para NFS-e (serviços), 'outra' para qualquer outro documento fiscal"
    ),
  number: z.string().nullable().describe("Número da nota fiscal"),
  series: z.string().nullable().describe("Série da nota fiscal, se informada"),
  accessKey: z
    .string()
    .nullable()
    .describe("Chave de acesso de 44 dígitos (NF-e), somente números; null se não houver"),
  issuer: z
    .string()
    .nullable()
    .describe("EMITENTE: razão social de quem emitiu a nota e recebe o pagamento (prestador/vendedor)"),
  issuerDocument: z.string().nullable().describe("CNPJ ou CPF do emitente, como impresso na nota"),
  recipient: z
    .string()
    .nullable()
    .describe("DESTINATÁRIO/TOMADOR: quem comprou ou contratou e paga pela nota (não é quem emitiu)"),
  recipientDocument: z.string().nullable().describe("CNPJ ou CPF do destinatário/tomador, como impresso na nota"),
  description: z
    .string()
    .nullable()
    .describe("Resumo curto do que foi comprado ou do serviço prestado"),
  issueDate: z.string().nullable().describe("Data de emissão, no formato YYYY-MM-DD"),
  dueDate: z
    .string()
    .nullable()
    .describe("Data de vencimento do pagamento, no formato YYYY-MM-DD; null se não houver"),
  value: z.number().nullable().describe("Valor total da nota em reais (sem separador de milhar)"),
  taxes: z
    .number()
    .nullable()
    .describe("Total de impostos/retenções destacados na nota, em reais; null se não houver"),
})

export type ExtractedFiscalNote = z.infer<typeof extractedFiscalNoteSchema>

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp"

export async function extractFiscalNote(
  base64Data: string,
  mediaType: string
): Promise<ExtractedFiscalNote> {
  const isPdf = mediaType === "application/pdf"

  const message = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 2048,
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
            text: "Extraia as informações principais desta nota fiscal brasileira (NF-e, NFS-e ou similar). Se um campo não estiver presente ou não puder ser determinado com confiança, retorne null para ele.",
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(extractedFiscalNoteSchema),
    },
  })

  if (!message.parsed_output) {
    throw new Error("Não foi possível extrair os dados da nota fiscal")
  }

  return message.parsed_output
}
