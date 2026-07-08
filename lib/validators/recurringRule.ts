import { z } from "zod"

export const recurringRuleSchema = z.object({
  description: z.string().min(1, "Informe a descrição"),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  direction: z.enum(["in", "out"]),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  accountId: z.string().min(1, "Selecione uma conta"),
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  startMonth: z.string().min(1, "Informe o mês de início"),
})
export type RecurringRuleFormValues = z.output<typeof recurringRuleSchema>
export type RecurringRuleFormInput = z.input<typeof recurringRuleSchema>
