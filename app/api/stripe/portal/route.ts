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
  const userSnap = await adminDb.collection("users").doc(authUser.uid).get()
  const customerId = userSnap.data()?.stripeCustomerId as string | undefined

  if (!customerId) {
    return NextResponse.json({ error: "Nenhuma assinatura encontrada" }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/assinatura`,
  })

  return NextResponse.json({ url: session.url })
}
