"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { useAuth } from "@/lib/auth/AuthProvider"
import { MonthProvider } from "@/lib/month/MonthProvider"
import { AppShell } from "@/components/layout/AppShell"

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [user, loading, router])

  if (loading || !user) {
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
