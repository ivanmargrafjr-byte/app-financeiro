import "server-only"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const app =
  getApps().length > 0
    ? getApps()[0]!
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      })

export const adminDb = getFirestore(app)

// firebase-admin/auth pulls in jose/jwks-rsa in a way that fails to bundle under
// Vercel's Node runtime (same issue as verifyRequest.ts), so admin-level Auth
// operations go through the Identity Toolkit Admin REST API instead, authenticated
// with an OAuth access token minted from this same service account credential.
export async function getAdminAccessToken() {
  const { access_token } = await app.options.credential!.getAccessToken()
  return access_token
}
