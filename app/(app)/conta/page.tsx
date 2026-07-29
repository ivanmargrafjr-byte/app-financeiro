"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useUserProfile } from "@/lib/hooks/useUserProfile"

export default function ContaPage() {
  const { user, signOut } = useAuth()
  const { data: profile } = useUserProfile()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    if (!user) return
    setDeleting(true)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) throw new Error("delete failed")
      await signOut()
      toast.success("Conta excluída")
      router.replace("/login")
    } catch {
      toast.error("Não foi possível excluir a conta. Tente novamente.")
      setDeleting(false)
    }
  }

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

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Excluir conta</CardTitle>
          <CardDescription>
            Remove permanentemente sua conta e todos os seus dados (contas, cartões,
            transações, categorias e recorrências). Essa ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              Excluir conta
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir sua conta permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os seus dados serão apagados e não poderão ser recuperados. Se você
                  tiver uma assinatura ativa, ela será cancelada.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? "Excluindo..." : "Excluir permanentemente"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
