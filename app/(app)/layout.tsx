"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { useAuth } from "@/lib/auth/AuthProvider"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useEnsureTrial } from "@/lib/hooks/useEnsureTrial"
import { useNow } from "@/lib/hooks/useNow"
import { MonthProvider } from "@/lib/month/MonthProvider"
import { AppShell } from "@/components/layout/AppShell"
import { hasAppAccess } from "@/lib/domain/subscriptionAccess"

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useUserProfile()
  const router = useRouter()

  // Anyone entitled to the free trial gets it here, before the paywall is even
  // considered — otherwise a returning account would be bounced to /assinatura in
  // the instant between loading its profile and being granted the days it is owed.
  const { pending: grantingTrial } = useEnsureTrial(profile)

  const now = useNow()
  const paywallDisabled = process.env.NEXT_PUBLIC_DISABLE_PAYWALL === "true"
  const hasAccess = paywallDisabled || hasAppAccess(profile, now)

  useEffect(() => {
    if (loading || profileLoading || grantingTrial) return
    if (!user) {
      router.replace("/login")
    } else if (!hasAccess) {
      router.replace("/assinatura")
    }
  }, [user, loading, profileLoading, grantingTrial, hasAccess, router])

  if (loading || !user || profileLoading || grantingTrial || !hasAccess) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <MonthProvider>
      <AppShell>{children}</AppShell>
    </MonthProvider>
  )
}
