import { z } from "zod"

import { parseAmountInput } from "@/lib/domain/money"

/**
 * The juros field is a free-text decimal input, so it arrives the way a pt-BR
 * keyboard produces it ("12,50"). `z.coerce.number()` reads that as NaN and rejects
 * a perfectly valid amount, so normalize the separator before coercing.
 */
const amountFromInput = z.preprocess(
  (value) => (typeof value === "string" ? parseAmountInput(value) : value),
  z.number({ message: "Informe um valor válido" })
)

export const cardPurchaseSchema = z.object({
  description: z.string().min(1, "Informe a descrição"),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  date: z.string().min(1, "Informe a data"),
  installmentTotal: z.coerce.number().int().min(1, "Mínimo 1x").max(48, "Máximo 48x"),
  interestAmount: amountFromInput.refine((n) => n >= 0, "Não pode ser negativo").default(0),
})
export type CardPurchaseFormValues = z.output<typeof cardPurchaseSchema>
export type CardPurchaseFormInput = z.input<typeof cardPurchaseSchema>
