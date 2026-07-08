import { z } from "zod"

export const cardSchema = z.object({
  name: z.string().min(1, "Informe o nome do cartão"),
  limit: z.coerce.number().nonnegative("Informe um limite válido"),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  linkedAccountId: z.string().min(1, "Selecione a conta de pagamento"),
  icon: z.string().min(1),
  iconUrl: z.string().optional(),
  color: z.string().min(1),
})
export type CardFormValues = z.output<typeof cardSchema>
export type CardFormInput = z.input<typeof cardSchema>
