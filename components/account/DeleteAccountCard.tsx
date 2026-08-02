"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

export function DeleteAccountCard() {
  const { user, signOut } = useAuth()
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
  )
}
