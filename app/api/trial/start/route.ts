import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/lib/firebaseAdmin/client"
import { verifyRequestUser } from "@/lib/firebaseAdmin/verifyRequest"
import { isEligibleForTrial, trialEndsAtFrom } from "@/lib/domain/subscriptionAccess"

/**
 * Creates the user's profile and grants the card-less trial.
 *
 * This lives on the server, with Admin SDK credentials, because it is the only
 * thing standing between a signup and free access: `trialEndsAt` decides who may
 * use the app, so a client that could write it could write the year 2099. The
 * matching Firestore rules refuse every billing field from the client — including
 * on create, which used to be unrestricted.
 *
 * Safe to call on every entry: it grants at most once per account, and otherwise
 * reports back whatever the profile already says.
 */

/**
 * Server-side first, since the NEXT_PUBLIC_ copy is readable — and therefore
 * forgeable — by anyone. The fallback keeps the existing deployment working until
 * the variable is moved.
 */
const EXEMPT_EMAILS = (process.env.EXEMPT_EMAILS ?? process.env.NEXT_PUBLIC_EXEMPT_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export async function POST(request: Request) {
  const authUser = await verifyRequestUser(request)
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const displayName = typeof body?.displayName === "string" ? body.displayName : null

  const userRef = adminDb.collection("users").doc(authUser.uid)

  try {
    const result = await adminDb.runTransaction(async (trx) => {
      const snap = await trx.get(userRef)
      const data = snap.data() ?? {}

      // Everything a profile needs on first sight; on an existing doc, nothing here
      // is touched beyond the trial fields below.
      const created = snap.exists
        ? {}
        : {
            email: authUser.email,
            displayName: displayName ?? null,
            createdAt: FieldValue.serverTimestamp(),
            onboarded: true,
          }

      const isExempt = !!authUser.email && EXEMPT_EMAILS.includes(authUser.email.toLowerCase())
      if (isExempt) {
        trx.set(userRef, { ...created, subscriptionStatus: "exempt" }, { merge: true })
        return { subscriptionStatus: "exempt", trialEndsAt: null, granted: false }
      }

      if (!isEligibleForTrial(data)) {
        // Nothing to grant. Still create the doc if it somehow doesn't exist, so the
        // caller never ends up authenticated with no profile at all.
        if (!snap.exists) {
          trx.set(userRef, { ...created, subscriptionStatus: "none" }, { merge: true })
        }
        return {
          subscriptionStatus: data.subscriptionStatus ?? "none",
          trialEndsAt: data.trialEndsAt ?? null,
          granted: false,
        }
      }

      const startedAt = Date.now()
      const endsAt = trialEndsAtFrom(startedAt)
      trx.set(
        userRef,
        {
          ...created,
          subscriptionStatus: "free_trial",
          trialStartedAt: startedAt,
          trialEndsAt: endsAt,
        },
        { merge: true }
      )
      return { subscriptionStatus: "free_trial", trialEndsAt: endsAt, granted: true }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Não foi possível liberar o teste" }, { status: 500 })
  }
}
