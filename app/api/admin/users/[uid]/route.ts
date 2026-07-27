import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebaseAdmin/client"
import { verifyRequestUser } from "@/lib/firebaseAdmin/verifyRequest"
import { isAdminEmail } from "@/lib/admin/isAdmin"
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
