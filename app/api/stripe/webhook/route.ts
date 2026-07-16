import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { stripe } from "@/lib/stripe/client"
import { adminDb } from "@/lib/firebaseAdmin/client"
import type { SubscriptionStatus } from "@/lib/types"

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing"
    case "active":
      return "active"
    case "past_due":
      return "past_due"
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "canceled"
    case "incomplete":
    default:
      return "none"
  }
}

async function updateUserByCustomerId(customerId: string, patch: Record<string, unknown>) {
  const snap = await adminDb
    .collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get()
  if (snap.empty) return
  await snap.docs[0].ref.set(patch, { merge: true })
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const uid = session.client_reference_id
        if (!uid || !session.customer) break
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string | null

        let status: SubscriptionStatus = "active"
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          status = mapStripeStatus(subscription.status)
        }

        await adminDb.collection("users").doc(uid).set(
          {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId ?? undefined,
            subscriptionStatus: status,
          },
          { merge: true }
        )
        break
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription
        await updateUserByCustomerId(subscription.customer as string, {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: mapStripeStatus(subscription.status),
        })
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await updateUserByCustomerId(subscription.customer as string, {
          subscriptionStatus: "canceled",
        })
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error("[stripe/webhook] handling failed:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
