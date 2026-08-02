"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteAccountCard } from "@/components/account/DeleteAccountCard"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useUserProfile } from "@/lib/hooks/useUserProfile"

export default function ContaPage() {
  const { user } = useAuth()
  const { data: profile } = useUserProfile()

  return (
    <div className="grid max-w-sm gap-4">
      <h1 className="text-xl font-semibold">Conta</h1>

      <Card>
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
          <CardDescription>{profile?.email ?? user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" nativeButton={false} render={<Link href="/assinatura" />}>
            Gerenciar assinatura
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountCard />
    </div>
  )
}
