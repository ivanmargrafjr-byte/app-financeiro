"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Purchases, type PurchasesStoreProduct } from "@revenuecat/purchases-capacitor"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DeleteAccountCard } from "@/components/account/DeleteAccountCard"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/types"
import {
  configureRevenueCat,
  isIOSNativeApp,
  isPurchaseCancelledError,
  purchasePremium,
  restorePurchases,
} from "@/lib/iap/revenuecat"

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
  const [iosProduct, setIosProduct] = useState<PurchasesStoreProduct | null>(null)
  const isIOS = isIOSNativeApp()

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login")
  }, [authLoading, user, router])

  useEffect(() => {
    if (searchParams.get("checkout") === "cancelled") {
      toast.info("Assinatura não concluída")
    }
  }, [searchParams])

  useEffect(() => {
    if (!isIOS || !user) return
    configureRevenueCat(user.uid)
      .then(() => Purchases.getOfferings())
      .then((offerings) => {
        const pkg = offerings.current?.availablePackages[0]
        if (pkg) setIosProduct(pkg.product)
      })
      .catch(() => {
        // Falls back to the static price copy below if offerings can't be fetched.
      })
  }, [isIOS, user])

  const status = profile?.subscriptionStatus ?? "none"
  const hasAccess = ACTIVE_SUBSCRIPTION_STATUSES.includes(status)

  // Whichever path granted access (Stripe webhook or RevenueCat webhook), move on
  // as soon as Firestore reflects it — no need to know which one just fired.
  useEffect(() => {
    if (hasAccess) router.replace("/dashboard")
  }, [hasAccess, router])

  async function handleSubscribeStripe() {
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

  async function handleSubscribeIOS() {
    setSubmitting(true)
    try {
      await purchasePremium()
      toast.success("Assinatura confirmada — liberando o app...")
    } catch (error) {
      if (!isPurchaseCancelledError(error)) {
        toast.error("Não foi possível concluir a assinatura")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRestore() {
    setSubmitting(true)
    try {
      const restored = await restorePurchases()
      if (!restored) {
        toast.info("Nenhuma assinatura ativa encontrada para restaurar")
      }
    } catch {
      toast.error("Não foi possível restaurar a assinatura")
    } finally {
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

  const canManage = status !== "exempt" && status !== "none" && !!profile?.stripeCustomerId

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="grid w-full max-w-sm gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Finanças Premium Mensal
              <Badge variant={hasAccess ? "secondary" : "outline"}>{STATUS_LABELS[status]}</Badge>
            </CardTitle>
            <CardDescription>
              Assinatura mensal com renovação automática.{" "}
              {hasAccess
                ? "Sua conta tem acesso ao Finanças."
                : "Assine para continuar usando o app."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            {!hasAccess && isIOS && (
              <>
                <p className="text-2xl font-semibold">
                  {iosProduct?.priceString ?? "R$ 19,90"}
                  <span className="text-muted-foreground text-sm font-normal">/mês</span>
                </p>
                <p className="text-muted-foreground text-sm">
                  {iosProduct?.introPrice && iosProduct.introPrice.price === 0
                    ? `${iosProduct.introPrice.periodNumberOfUnits} dias grátis antes da primeira cobrança.`
                    : "7 dias grátis antes da primeira cobrança."}
                </p>
                <Button onClick={handleSubscribeIOS} disabled={submitting}>
                  {submitting ? "Processando..." : "Assinar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRestore} disabled={submitting}>
                  Restaurar compras
                </Button>
              </>
            )}
            {!hasAccess && !isIOS && (
              <>
                <p className="text-2xl font-semibold">
                  R$ 19,90<span className="text-muted-foreground text-sm font-normal">/mês</span>
                </p>
                <p className="text-muted-foreground text-sm">7 dias grátis antes da primeira cobrança.</p>
                <Button onClick={handleSubscribeStripe} disabled={submitting}>
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
            <p className="text-muted-foreground text-center text-xs">
              <Link href="/termos" className="underline">
                Termos de Uso
              </Link>
              {" · "}
              <Link href="/privacidade" className="underline">
                Política de Privacidade
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Reachable regardless of subscription state — deleting an account can't
            require paying for one first. */}
        <DeleteAccountCard />
      </div>
    </div>
  )
}
