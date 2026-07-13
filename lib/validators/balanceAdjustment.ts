import { z } from "zod"

export const balanceAdjustmentSchema = z.object({
  newBalance: z.coerce.number(),
  date: z.string().min(1, "Informe a data"),
  description: z.string().optional(),
})
export type BalanceAdjustmentFormValues = z.output<typeof balanceAdjustmentSchema>
export type BalanceAdjustmentFormInput = z.input<typeof balanceAdjustmentSchema>
