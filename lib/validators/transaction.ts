import { z } from "zod"

export const accountTransactionSchema = z.object({
  description: z.string().min(1, "Informe a descrição"),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  direction: z.enum(["in", "out"]),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  accountId: z.string().min(1, "Selecione uma conta"),
  date: z.string().min(1, "Informe a data"),
})
export type AccountTransactionFormValues = z.output<typeof accountTransactionSchema>
export type AccountTransactionFormInput = z.input<typeof accountTransactionSchema>
