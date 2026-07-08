const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Já existe uma conta com este e-mail.",
  "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
  "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
}

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  return "Ocorreu um erro. Tente novamente."
}
