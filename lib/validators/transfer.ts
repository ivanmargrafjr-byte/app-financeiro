import { z } from "zod"

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Selecione a conta de origem"),
    toAccountId: z.string().min(1, "Selecione a conta de destino"),
    amount: z.coerce.number().positive("Informe um valor maior que zero"),
    date: z.string().min(1, "Informe a data"),
    description: z.string().optional(),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: "Selecione contas diferentes",
    path: ["toAccountId"],
  })
export type TransferFormValues = z.output<typeof transferSchema>
export type TransferFormInput = z.input<typeof transferSchema>
