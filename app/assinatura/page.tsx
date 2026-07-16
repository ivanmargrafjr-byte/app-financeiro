"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/types"

const STATUS_LABELS: Record<string, string> = {
  exempt: "Acesso liberado",
  trialing: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  none: "Sem assinatura",
}

export default function AssinaturaPage() {
  return (
    <Suspense fallback={null}>
      <AssinaturaContent />
    </Suspense>
  )
}

function AssinaturaContent() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { data: profile, isLoading: profileLoading } = useUserProfile()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login")
  }, [authLoading, user, router])

  useEffect(() => {
    if (searchParams.get("checkout") === "cancelled") {
      toast.info("Assinatura não concluída")
    }
  }, [searchParams])

  async function handleSubscribe() {
    if (!user) return
    setSubmitting(true)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) throw new Error("checkout failed")
      const { url } = await res.json()
      window.location.href = url
    } catch {
      toast.error("Não foi possível iniciar a assinatura")
      setSubmitting(false)
    }
  }

  async function handleManage() {
    if (!user) return
    setSubmitting(true)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) throw new Error("portal failed")
      const { url } = await res.json()
      window.location.href = url
    } catch {
      toast.error("Não foi possível abrir o gerenciamento da assinatura")
      setSubmitting(false)
    }
  }

  if (authLoading || !user || profileLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    )
  }

  const status = profile?.subscriptionStatus ?? "none"
  const hasAccess = ACTIVE_SUBSCRIPTION_STATUSES.includes(status)
  const canManage = status !== "exempt" && status !== "none" && !!profile?.stripeCustomerId

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Assinatura
            <Badge variant={hasAccess ? "secondary" : "outline"}>{STATUS_LABELS[status]}</Badge>
          </CardTitle>
          <CardDescription>
            {hasAccess
              ? "Sua conta tem acesso ao Finanças."
              : "Assine o Finanças Premium para continuar usando o app."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!hasAccess && (
            <>
              <p className="text-2xl font-semibold">
                R$ 19,90<span className="text-muted-foreground text-sm font-normal">/mês</span>
              </p>
              <p className="text-muted-foreground text-sm">7 dias grátis antes da primeira cobrança.</p>
              <Button onClick={handleSubscribe} disabled={submitting}>
                {submitting ? "Abrindo..." : "Assinar"}
              </Button>
            </>
          )}
          {hasAccess && canManage && (
            <Button variant="outline" onClick={handleManage} disabled={submitting}>
              {submitting ? "Abrindo..." : "Gerenciar assinatura"}
            </Button>
          )}
          {hasAccess && (
            <Button variant="ghost" onClick={() => router.replace("/dashboard")}>
              Ir para o app
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
