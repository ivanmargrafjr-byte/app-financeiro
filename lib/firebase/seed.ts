import { doc, serverTimestamp, writeBatch } from "firebase/firestore"
import { db } from "./client"
import { categoriesCol, userDocRef } from "./paths"
import type { CategoryType, SubscriptionStatus } from "@/lib/types"

const EXEMPT_EMAILS = (process.env.NEXT_PUBLIC_EXEMPT_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

function initialSubscriptionStatus(email: string | null): SubscriptionStatus {
  return email && EXEMPT_EMAILS.includes(email.toLowerCase()) ? "exempt" : "none"
}

const DEFAULT_CATEGORIES: { name: string; type: CategoryType; icon: string; color: string }[] = [
  { name: "Salário", type: "receita", icon: "Wallet", color: "#16a34a" },
  { name: "Outras receitas", type: "receita", icon: "PiggyBank", color: "#22c55e" },
  { name: "Mercado", type: "despesa", icon: "ShoppingCart", color: "#f97316" },
  { name: "Transporte", type: "despesa", icon: "Car", color: "#0ea5e9" },
  { name: "Moradia", type: "despesa", icon: "Home", color: "#8b5cf6" },
  { name: "Saúde", type: "despesa", icon: "HeartPulse", color: "#ef4444" },
  { name: "Lazer", type: "despesa", icon: "PartyPopper", color: "#ec4899" },
  { name: "Educação", type: "despesa", icon: "BookOpen", color: "#6366f1" },
  { name: "Assinaturas", type: "despesa", icon: "Repeat", color: "#14b8a6" },
  { name: "Outras despesas", type: "despesa", icon: "Receipt", color: "#64748b" },
]

/** Creates the user's profile doc and seeds default categories. Safe to call only on first login. */
export async function seedNewUser(uid: string, email: string | null, displayName: string | null) {
  const batch = writeBatch(db)

  batch.set(userDocRef(uid), {
    email,
    displayName,
    createdAt: serverTimestamp(),
    onboarded: true,
    subscriptionStatus: initialSubscriptionStatus(email),
  })

  const categoriesRef = categoriesCol(uid)
  for (const category of DEFAULT_CATEGORIES) {
    const ref = doc(categoriesRef)
    batch.set(ref, { ...category, archived: false, isDefault: true, parentId: null })
  }

  await batch.commit()
}
