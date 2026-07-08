import { z } from "zod"

export const accountSchema = z.object({
  name: z.string().min(1, "Informe o nome da conta"),
  type: z.enum(["corrente", "poupanca", "carteira"]),
  initialBalance: z.coerce.number(),
  icon: z.string().min(1),
  color: z.string().min(1),
})
export type AccountFormValues = z.output<typeof accountSchema>
export type AccountFormInput = z.input<typeof accountSchema>
