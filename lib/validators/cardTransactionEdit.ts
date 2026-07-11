import { z } from "zod"

export const cardTransactionEditSchema = z.object({
  description: z.string().min(1, "Informe a descrição"),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  date: z.string().min(1, "Informe a data"),
})
export type CardTransactionEditFormValues = z.output<typeof cardTransactionEditSchema>
export type CardTransactionEditFormInput = z.input<typeof cardTransactionEditSchema>
