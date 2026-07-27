import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebaseAdmin/client"
import { verifyRequestUser } from "@/lib/firebaseAdmin/verifyRequest"
import { isAdminEmail } from "@/lib/admin/isAdmin"

export async function GET(request: Request) {
  const authUser = await verifyRequestUser(request)
  if (!authUser || !isAdminEmail(authUser.email)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  const snap = await adminDb.collection("users").get()
  const users = snap.docs.map((doc) => {
    const data = doc.data()
    return {
      uid: doc.id,
      email: (data.email as string | null | undefined) ?? null,
      displayName: (data.displayName as string | null | undefined) ?? null,
      subscriptionStatus: (data.subscriptionStatus as string | undefined) ?? "none",
      stripeCustomerId: (data.stripeCustomerId as string | undefined) ?? null,
    }
  })

  return NextResponse.json({ users })
}
