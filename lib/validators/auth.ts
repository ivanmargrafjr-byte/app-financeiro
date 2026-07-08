import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
})
export type SignupFormValues = z.infer<typeof signupSchema>
