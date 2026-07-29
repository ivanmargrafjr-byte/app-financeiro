import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebaseAdmin/client"
import { verifyRequestUser } from "@/lib/firebaseAdmin/verifyRequest"
import { stripe } from "@/lib/stripe/client"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  const authUser = await verifyRequestUser(request)
  if (!authUser || !idToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const userRef = adminDb.collection("users").doc(authUser.uid)
  const userSnap = await userRef.get()
  const stripeSubscriptionId = userSnap.data()?.stripeSubscriptionId as string | undefined

  if (stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(stripeSubscriptionId)
    } catch {
      // Best-effort — a Stripe hiccup shouldn't block the account/data deletion below.
    }
  }

  await adminDb.recursiveDelete(userRef)

  // No firebase-admin/auth here — see verifyRequest.ts on why that module doesn't
  // bundle cleanly under Vercel's Node runtime. The Identity Toolkit REST endpoint
  // does the same self-service deletion given the caller's own (already-verified) ID token.
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const deleteRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  )
  if (!deleteRes.ok) {
    return NextResponse.json({ error: "Não foi possível excluir a conta" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
