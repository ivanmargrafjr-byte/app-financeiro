/**
 * Whether `pathname` is `route` itself or one of the pages under it.
 *
 * A bare `startsWith` is not enough: "/contas" starts with "/conta", so the Conta
 * item lit up whenever Contas was open. The match has to stop at a segment boundary.
 */
export function isWithinRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`)
}
