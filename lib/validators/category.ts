import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().min(1, "Informe o nome da categoria"),
  type: z.enum(["receita", "despesa"]),
  icon: z.string().min(1),
  color: z.string().min(1),
  parentId: z.string().nullable(),
})
export type CategoryFormValues = z.infer<typeof categorySchema>
