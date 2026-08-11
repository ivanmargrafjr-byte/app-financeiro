import { z } from "zod"

import { MONTH_STRING_PATTERN } from "@/lib/domain/dateUtils"

// `<input type="month">` normally yields YYYY-MM, but nothing guaranteed it — a stray
// value like "2027/12" used to be stored as-is and then crash every screen that
// rendered it. Pin the format here so bad months can't be saved in the first place.
const monthString = z.string().regex(MONTH_STRING_PATTERN, "Use um mês válido (AAAA-MM)")

export const recurringRuleSchema = z.object({
  description: z.string().min(1, "Informe a descrição"),
  amount: z.coerce.number().positive("Informe um valor maior que zero"),
  direction: z.enum(["in", "out"]),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  accountId: z.string().min(1, "Selecione uma conta"),
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  startMonth: monthString,
  // Empty means "sem data de término" — the create/update hooks turn it into null.
  endMonth: z.union([monthString, z.literal("")]).optional(),
})
export type RecurringRuleFormValues = z.output<typeof recurringRuleSchema>
export type RecurringRuleFormInput = z.input<typeof recurringRuleSchema>
