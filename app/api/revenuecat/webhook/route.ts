import { NextResponse } from "next/server"

// Stub while RevenueCat is being configured — accepts the request so the webhook
// URL validates in RevenueCat's dashboard. Real signature check + subscriptionStatus
// sync logic still needs the webhook secret and entitlement/product identifiers.
export async function POST(request: Request) {
  await request.text()
  return NextResponse.json({ ok: true })
}
