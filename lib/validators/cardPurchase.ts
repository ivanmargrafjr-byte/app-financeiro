import { z } from "zod"

export const cardPurchaseSchema = z.object({
  description: z.string().min(1, "Informe a descrição"),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  date: z.string().min(1, "Informe a data"),
  installmentTotal: z.coerce.number().int().min(1, "Mínimo 1x").max(48, "Máximo 48x"),
})
export type CardPurchaseFormValues = z.output<typeof cardPurchaseSchema>
export type CardPurchaseFormInput = z.input<typeof cardPurchaseSchema>
