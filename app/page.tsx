"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/AuthProvider"
import { LandingPage } from "@/components/marketing/LandingPage"

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Signed-in users still go straight to the app. Everyone else used to be bounced
  // to the login form — which is what an ad click landed on, with no explanation of
  // what this is and no way to reach the store listings.
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard")
  }, [user, loading, router])

  if (loading || user) return null

  return <LandingPage />
}
