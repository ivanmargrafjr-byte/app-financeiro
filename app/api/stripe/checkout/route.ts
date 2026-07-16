import { NextResponse } from "next/server"

import { stripe } from "@/lib/stripe/client"
import { adminDb } from "@/lib/firebaseAdmin/client"
import { verifyRequestUser } from "@/lib/firebaseAdmin/verifyRequest"

export async function POST(request: Request) {
  const authUser = await verifyRequestUser(request)
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const origin = request.headers.get("origin") ?? "https://finnancialapp.margraf.tec.br"
  const userRef = adminDb.collection("users").doc(authUser.uid)
  const userSnap = await userRef.get()
  const existingCustomerId = userSnap.data()?.stripeCustomerId as string | undefined

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    client_reference_id: authUser.uid,
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : { customer_email: authUser.email ?? undefined }),
    success_url: `${origin}/assinatura?checkout=success`,
    cancel_url: `${origin}/assinatura?checkout=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
