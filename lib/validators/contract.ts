import { z } from "zod"

function blankToUndefined(v: unknown) {
  return v === "" || v === null || v === undefined ? undefined : v
}

export const contractSchema = z.object({
  number: z.string().min(1, "Informe o número do contrato"),
  contractor: z.string().min(1, "Informe o contratante"),
  contractee: z.string().min(1, "Informe o contratado"),
  scope: z.string().min(1, "Informe o objeto/escopo do contrato"),
  startDate: z.string().min(1, "Informe o início da vigência"),
  endDate: z.string().min(1, "Informe o fim da vigência"),
  executionDays: z.preprocess(blankToUndefined, z.coerce.number().int().nonnegative().optional()),
  paymentMethod: z.string().min(1, "Informe a forma de pagamento"),
  value: z.preprocess(blankToUndefined, z.coerce.number().nonnegative().optional()),
  notes: z.string().optional(),
  file: z.instanceof(File).optional(),
  billingPeriod: z
    .enum(["mensal", "bimestral", "trimestral", "semestral", "anual", "unico"])
    .default("mensal"),
  noticeDays: z.preprocess(blankToUndefined, z.coerce.number().int().nonnegative().optional()),
  autoRenew: z.boolean().default(false),
  promoEndsAt: z.preprocess(blankToUndefined, z.string().optional()),
  postPromoValue: z.preprocess(blankToUndefined, z.coerce.number().nonnegative().optional()),
  adjustmentMonth: z.preprocess(blankToUndefined, z.string().optional()),
  adjustmentIndex: z.preprocess(blankToUndefined, z.string().optional()),
})
export type ContractFormValues = z.output<typeof contractSchema>
export type ContractFormInput = z.input<typeof contractSchema>
