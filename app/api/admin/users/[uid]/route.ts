import { NextResponse } from "next/server"

import { adminDb, getAdminAccessToken } from "@/lib/firebaseAdmin/client"
import { verifyRequestUser } from "@/lib/firebaseAdmin/verifyRequest"
import { isAdminEmail } from "@/lib/admin/isAdmin"
import { stripe } from "@/lib/stripe/client"
import type { SubscriptionStatus } from "@/lib/types"

const MANUAL_STATUSES: SubscriptionStatus[] = ["canceled", "active"]

export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const authUser = await verifyRequestUser(request)
  if (!authUser || !isAdminEmail(authUser.email)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { uid } = await params
  const body = await request.json()
  const subscriptionStatus = body.subscriptionStatus as SubscriptionStatus

  if (!MANUAL_STATUSES.includes(subscriptionStatus)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 })
  }
  if (uid === authUser.uid) {
    return NextResponse.json({ error: "Não é possível alterar a própria conta" }, { status: 400 })
  }

  await adminDb.collection("users").doc(uid).set({ subscriptionStatus }, { merge: true })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const authUser = await verifyRequestUser(request)
  if (!authUser || !isAdminEmail(authUser.email)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const { uid } = await params
  if (uid === authUser.uid) {
    return NextResponse.json({ error: "Não é possível excluir a própria conta" }, { status: 400 })
  }

  const userRef = adminDb.collection("users").doc(uid)
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

  const accessToken = await getAdminAccessToken()
  const deleteRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${process.env.FIREBASE_ADMIN_PROJECT_ID}/accounts:delete`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ localId: uid }),
    }
  )
  // A 400 here almost always means the Auth user was already gone (e.g. a Firestore-only
  // leftover) — the Firestore doc is already deleted either way, so don't fail the request.
  if (!deleteRes.ok && deleteRes.status !== 400) {
    return NextResponse.json({ error: "Não foi possível excluir a conta" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
