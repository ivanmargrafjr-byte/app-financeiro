/**
 * The screens whose content actually changes with the month switcher — the only
 * ones that call `useMonth()`.
 *
 * Deliberately an allowlist. Every other screen (contas, cartões, recorrências,
 * categorias, contratos, conta, admin) shows the same thing in any month, and a
 * control that moves nothing reads as a broken one: people paged around looking
 * for the effect. A new screen therefore starts without the switcher and opts in
 * here, rather than inheriting a control it ignores.
 */
export const MONTH_SCOPED_ROUTES = ["/inicio", "/dashboard", "/transacoes"] as const

export function isMonthScopedRoute(pathname: string): boolean {
  return MONTH_SCOPED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}
