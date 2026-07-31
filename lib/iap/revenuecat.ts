"use client"

import { Capacitor } from "@capacitor/core"
import { Purchases, PURCHASES_ERROR_CODE, type PurchasesError } from "@revenuecat/purchases-capacitor"

// Must match the Entitlement identifier configured in the RevenueCat dashboard exactly.
const ENTITLEMENT_ID = "MargrafTec / FinnanciaApp Pro"

export function isIOSNativeApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios"
}

let configuredForUid: string | null = null

/** No-op outside the native iOS app — Stripe checkout handles web/Android. */
export async function configureRevenueCat(uid: string) {
  if (!isIOSNativeApp()) return
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY
  if (!apiKey) return
  if (configuredForUid === uid) return
  await Purchases.configure({ apiKey, appUserID: uid })
  configuredForUid = uid
}

function hasEntitlement(customerInfo: { entitlements: { active: Record<string, unknown> } }) {
  return !!customerInfo.entitlements.active[ENTITLEMENT_ID]
}

export async function hasActiveEntitlement(): Promise<boolean> {
  if (!isIOSNativeApp()) return false
  const { customerInfo } = await Purchases.getCustomerInfo()
  return hasEntitlement(customerInfo)
}

export function isPurchaseCancelledError(error: unknown): boolean {
  const code = (error as Partial<PurchasesError> | undefined)?.code
  return code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
}

/** Throws on failure; rejects with a PurchasesError (check isPurchaseCancelledError). */
export async function purchasePremium(): Promise<boolean> {
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages[0]
  if (!pkg) throw new Error("Nenhum plano de assinatura disponível no momento")
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
  return hasEntitlement(customerInfo)
}

export async function restorePurchases(): Promise<boolean> {
  const { customerInfo } = await Purchases.restorePurchases()
  return hasEntitlement(customerInfo)
}
