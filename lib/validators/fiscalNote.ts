import { z } from "zod"

import { normalizeAccessKey } from "@/lib/domain/fiscalNote"

function blankToUndefined(v: unknown) {
  return v === "" || v === null || v === undefined ? undefined : v
}

export const fiscalNoteSchema = z.object({
  kind: z.enum(["produto", "servico", "outra"]).default("servico"),
  number: z.string().min(1, "Informe o número da nota"),
  series: z.string().optional(),
  accessKey: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || normalizeAccessKey(v) !== null, "A chave de acesso tem 44 dígitos"),
  issuer: z.string().min(1, "Informe o emitente"),
  issuerDocument: z.string().optional(),
  recipient: z.string().optional(),
  recipientDocument: z.string().optional(),
  description: z.string().min(1, "Descreva o que foi comprado ou contratado"),
  issueDate: z.string().min(1, "Informe a data de emissão"),
  dueDate: z.preprocess(blankToUndefined, z.string().optional()),
  value: z.coerce.number({ message: "Informe o valor da nota" }).positive("Informe o valor da nota"),
  taxes: z.preprocess(blankToUndefined, z.coerce.number().nonnegative().optional()),
  notes: z.string().optional(),
  file: z.instanceof(File).optional(),
})
export type FiscalNoteFormValues = z.output<typeof fiscalNoteSchema>
export type FiscalNoteFormInput = z.input<typeof fiscalNoteSchema>
