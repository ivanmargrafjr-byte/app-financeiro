"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
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
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useNow } from "@/lib/hooks/useNow"
import { isAdminEmail } from "@/lib/admin/isAdmin"
import { adminStatusView } from "@/lib/admin/statusView"

/** Statuses an admin can set by hand — mirrors MANUAL_STATUSES on the API route. */
type ManualStatus = "canceled" | "active" | "exempt" | "none"

type AdminUser = {
  uid: string
  email: string | null
  displayName: string | null
  subscriptionStatus: string
  stripeCustomerId: string | null
  /** Millis, when the account ever had the card-less trial. */
  trialEndsAt: number | null
}

const STATUS_LABELS: Record<string, string> = {
  free_trial: "Teste grátis",
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

type SortKey = "email" | "displayName" | "subscriptionStatus"

function SortableHead({
  label,
  column,
  sort,
  onSort,
}: {
  label: string
  column: SortKey
  sort: { key: SortKey; dir: "asc" | "desc" }
  onSort: (key: SortKey) => void
}) {
  const active = sort.key === column
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <TableHead
      aria-sort={!active ? "none" : sort.dir === "asc" ? "ascending" : "descending"}
      className="bg-background sticky top-0"
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="hover:text-foreground focus-visible:ring-ring -mx-2 inline-flex min-h-9 items-center gap-1 rounded-md px-2 focus-visible:ring-2 focus-visible:outline-none"
      >
        {label}
        <Icon className="size-3.5" aria-hidden />
      </button>
    </TableHead>
  )
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const now = useNow()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "email",
    dir: "asc",
  })
  const [busyUid, setBusyUid] = useState<string | null>(null)

  const authorized = !authLoading && !!user && isAdminEmail(user.email)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!isAdminEmail(user.email)) {
      router.replace("/inicio")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!authorized || !user) return
    let cancelled = false
    async function loadUsers() {
      setLoadingUsers(true)
      setLoadFailed(false)
      try {
        const idToken = await user!.getIdToken()
        const res = await fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        if (!res.ok) throw new Error("failed")
        const { users: list } = await res.json()
        if (!cancelled) setUsers(list)
      } catch {
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }
    loadUsers()
    return () => {
      cancelled = true
    }
  }, [authorized, user, reloadKey])

  const STATUS_TOASTS: Record<ManualStatus, string> = {
    canceled: "Usuário bloqueado",
    active: "Usuário reativado",
    exempt: "Acesso liberado",
    none: "Acesso removido",
  }

  async function setStatus(uid: string, subscriptionStatus: ManualStatus) {
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
      toast.success(STATUS_TOASTS[subscriptionStatus])
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

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR")
    const rows = (users ?? []).filter(
      (u) =>
        !term ||
        (u.email ?? "").toLocaleLowerCase("pt-BR").includes(term) ||
        (u.displayName ?? "").toLocaleLowerCase("pt-BR").includes(term)
    )
    const factor = sort.dir === "asc" ? 1 : -1
    return rows.sort(
      (a, b) =>
        factor *
        (a[sort.key] ?? "").localeCompare(b[sort.key] ?? "", "pt-BR", { sensitivity: "base" })
    )
  }, [users, search, sort])

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    )
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
        <div className="grid gap-2" role="status" aria-label="Carregando usuários">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : loadFailed ? (
        <ErrorState
          title="Não foi possível carregar os usuários"
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : (
        <>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Input
            type="search"
            aria-label="Buscar usuário por e-mail ou nome"
            placeholder="Buscar por e-mail ou nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 max-w-sm"
          />
          <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
            {visibleUsers.length === (users?.length ?? 0)
              ? `${visibleUsers.length} usuários`
              : `${visibleUsers.length} de ${users?.length ?? 0} usuários`}
          </p>
        </div>
        {visibleUsers.length === 0 && (
          <EmptyState title="Nenhum usuário encontrado">
            {search ? "Tente outro trecho do e-mail ou do nome." : "Ainda não há usuários cadastrados."}
          </EmptyState>
        )}
        {visibleUsers.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="E-mail" column="email" sort={sort} onSort={toggleSort} />
              <SortableHead label="Nome" column="displayName" sort={sort} onSort={toggleSort} />
              <SortableHead
                label="Assinatura"
                column="subscriptionStatus"
                sort={sort}
                onSort={toggleSort}
              />
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.map((u) => {
              const blocked = u.subscriptionStatus === "canceled"
              const exempt = u.subscriptionStatus === "exempt"
              const view = adminStatusView(u.subscriptionStatus, u.trialEndsAt, now)
              return (
                <TableRow key={u.uid}>
                  <TableCell>{u.email ?? "—"}</TableCell>
                  <TableCell>{u.displayName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(view.status)}>
                      {STATUS_LABELS[view.status] ?? view.status}
                    </Badge>
                    {view.trialLine && (
                      <p className="text-muted-foreground mt-1 text-xs whitespace-nowrap">
                        {view.trialLine}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyUid === u.uid}
                        onClick={() => setStatus(u.uid, exempt ? "none" : "exempt")}
                      >
                        {exempt ? "Remover acesso" : "Liberar acesso"}
                      </Button>
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
        </>
      )}
    </div>
  )
}
