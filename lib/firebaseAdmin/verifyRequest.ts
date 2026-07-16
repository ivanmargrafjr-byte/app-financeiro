import "server-only"

/**
 * Verifies the Firebase ID token from an `Authorization: Bearer <token>` header via
 * the Identity Toolkit REST API rather than firebase-admin/auth's verifyIdToken —
 * that module pulls in jose/jwks-rsa in a way that fails to bundle correctly under
 * Vercel's Node runtime (ERR_REQUIRE_ESM). A REST round-trip to Google avoids the
 * dependency entirely and is plenty fast for the low-volume checkout/portal routes.
 */
export async function verifyRequestUser(request: Request) {
  const authHeader = request.headers.get("authorization")
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!idToken) return null

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  )
  if (!res.ok) return null

  const data = await res.json()
  const account = data.users?.[0]
  if (!account?.localId) return null

  return { uid: account.localId as string, email: (account.email as string | undefined) ?? null }
}
