"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { useAuth } from "@/lib/auth/AuthProvider"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { MonthProvider } from "@/lib/month/MonthProvider"
import { AppShell } from "@/components/layout/AppShell"
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/types"

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useUserProfile()
  const router = useRouter()

  const hasAccess = !!profile && ACTIVE_SUBSCRIPTION_STATUSES.includes(profile.subscriptionStatus)

  useEffect(() => {
    if (loading || profileLoading) return
    if (!user) {
      router.replace("/login")
    } else if (!hasAccess) {
      router.replace("/assinatura")
    }
  }, [user, loading, profileLoading, hasAccess, router])

  if (loading || !user || profileLoading || !hasAccess) {
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
