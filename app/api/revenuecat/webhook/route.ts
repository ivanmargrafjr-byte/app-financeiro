import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebaseAdmin/client"
import type { SubscriptionStatus } from "@/lib/types"

type RevenueCatEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "PRODUCT_CHANGE"
  | "UNCANCELLATION"
  | "SUBSCRIPTION_EXTENDED"
  | "TEMPORARY_ENTITLEMENT_GRANT"
  | "NON_RENEWING_PURCHASE"
  | "REFUND_REVERSED"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "CANCELLATION"
  | "SUBSCRIPTION_PAUSED"
  | "TRANSFER"
  | "INVOICE_ISSUANCE"
  | "TEST"

// We configure Purchases with appUserID = the Firebase uid, so app_user_id here is
// always that uid — no separate customer-id lookup needed like the Stripe webhook.
function mapEventToStatus(
  type: RevenueCatEventType,
  periodType: string | undefined
): SubscriptionStatus | null {
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "SUBSCRIPTION_EXTENDED":
    case "TEMPORARY_ENTITLEMENT_GRANT":
    case "NON_RENEWING_PURCHASE":
    case "REFUND_REVERSED":
      return periodType === "TRIAL" ? "trialing" : "active"
    case "EXPIRATION":
      return "canceled"
    case "BILLING_ISSUE":
      return "past_due"
    // CANCELLATION only turns off auto-renew — the entitlement (and our "active"/
    // "trialing" status) stays correct until EXPIRATION actually fires.
    // SUBSCRIPTION_PAUSED/TRANSFER/INVOICE_ISSUANCE/TEST: no Android purchases wired
    // up yet and TEST payloads don't carry a real app_user_id — nothing to update.
    default:
      return null
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!expectedSecret || authHeader !== expectedSecret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const body = await request.json()
  const event = body?.event as
    | { type?: RevenueCatEventType; app_user_id?: string; period_type?: string }
    | undefined

  const appUserId = event?.app_user_id
  const eventType = event?.type
  if (!appUserId || !eventType) {
    return NextResponse.json({ ok: true })
  }

  const newStatus = mapEventToStatus(eventType, event?.period_type)
  if (newStatus) {
    const userRef = adminDb.collection("users").doc(appUserId)
    const userSnap = await userRef.get()
    if (userSnap.exists) {
      await userRef.set({ subscriptionStatus: newStatus }, { merge: true })
    }
  }

  return NextResponse.json({ ok: true })
}
