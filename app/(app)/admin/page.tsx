"use client"

import { useEffect, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth/AuthProvider"
import { isAdminEmail } from "@/lib/admin/isAdmin"

type AdminUser = {
  uid: string
  email: string | null
  displayName: string | null
  subscriptionStatus: string
  stripeCustomerId: string | null
}

const STATUS_LABELS: Record<string, string> = {
  exempt: "Acesso liberado",
  trialing: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  none: "Sem assinatura",
}

function statusVariant(status: string): "secondary" | "outline" | "destructive" {
  if (status === "active" || status === "trialing" || status === "exempt") return "secondary"
  if (status === "past_due" || status === "canceled") return "destructive"
  return "outline"
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [busyUid, setBusyUid] = useState<string | null>(null)

  const authorized = !authLoading && !!user && isAdminEmail(user.email)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!isAdminEmail(user.email)) {
      router.replace("/dashboard")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!authorized || !user) return
    let cancelled = false
    async function loadUsers() {
      setLoadingUsers(true)
      try {
        const idToken = await user!.getIdToken()
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        if (!res.ok) throw new Error("failed")
        const { users: list } = await res.json()
        if (!cancelled) setUsers(list)
      } catch {
        if (!cancelled) toast.error("Não foi possível carregar os usuários")
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }
    loadUsers()
    return () => {
      cancelled = true
    }
  }, [authorized, user])

  async function setStatus(uid: string, subscriptionStatus: "active" | "canceled") {
    if (!user) return
    setBusyUid(uid)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus }),
      })
      if (!res.ok) throw new Error("failed")
      setUsers((prev) =>
        prev ? prev.map((u) => (u.uid === uid ? { ...u, subscriptionStatus } : u)) : prev
      )
      toast.success(subscriptionStatus === "canceled" ? "Usuário bloqueado" : "Usuário reativado")
    } catch {
      toast.error("Não foi possível atualizar o usuário")
    } finally {
      setBusyUid(null)
    }
  }

  async function deleteUser(uid: string) {
    if (!user) return
    setBusyUid(uid)
    try {
      const idToken = await user.getIdToken()
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) throw new Error("failed")
      setUsers((prev) => (prev ? prev.filter((u) => u.uid !== uid) : prev))
      toast.success("Usuário excluído")
    } catch {
      toast.error("Não foi possível excluir o usuário")
    } finally {
      setBusyUid(null)
    }
  }

  if (authLoading || !authorized) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold">Usuários</h1>
      {loadingUsers ? (
        <p className="text-muted-foreground text-sm">Carregando usuários...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((u) => {
              const blocked = u.subscriptionStatus === "canceled"
              return (
                <TableRow key={u.uid}>
                  <TableCell>{u.email ?? "—"}</TableCell>
                  <TableCell>{u.displayName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(u.subscriptionStatus)}>
                      {STATUS_LABELS[u.subscriptionStatus] ?? u.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant={blocked ? "outline" : "destructive"}
                        disabled={busyUid === u.uid}
                        onClick={() => setStatus(u.uid, blocked ? "active" : "canceled")}
                      >
                        {blocked ? "Reativar" : "Bloquear"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={<Button size="sm" variant="destructive" disabled={busyUid === u.uid} />}
                        >
                          Excluir
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir {u.email ?? "este usuário"}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Todos os dados dessa conta (contas, cartões, transações, categorias e
                              recorrências) serão apagados permanentemente. Se houver uma assinatura
                              Stripe ativa, ela será cancelada.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => deleteUser(u.uid)}
                              disabled={busyUid === u.uid}
                            >
                              {busyUid === u.uid ? "Excluindo..." : "Excluir permanentemente"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
