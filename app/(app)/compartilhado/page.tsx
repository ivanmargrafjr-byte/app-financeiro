"use client"

import { useMemo, useState } from "react"
import { Plus, UserMinus, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { SharedExpenseDialog } from "@/components/shared/SharedExpenseDialog"
import { SharedExpenseList } from "@/components/shared/SharedExpenseList"
import { SpaceBalances } from "@/components/shared/SpaceBalances"
import { useAuth } from "@/lib/auth/AuthProvider"
import {
  useAcceptInvite,
  useAddSettlement,
  useAddSharedExpense,
  useCreateSharedSpace,
  useInviteToSpace,
  useRemoveFromSpace,
  useSharedSpaces,
  useSpaceLedger,
} from "@/lib/hooks/useSharedSpaces"
import { balances, settleUp, type Transfer } from "@/lib/domain/sharedSpace"
import { todayDateString } from "@/lib/domain/dateUtils"

export default function CompartilhadoPage() {
  const { user } = useAuth()
  const { data, isLoading } = useSharedSpaces()
  const createSpace = useCreateSharedSpace()
  const acceptInvite = useAcceptInvite()
  const invite = useInviteToSpace()
  const removeMember = useRemoveFromSpace()
  const addExpense = useAddSharedExpense()
  const addSettlement = useAddSettlement()

  const [creating, setCreating] = useState(false)
  const [spaceName, setSpaceName] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [addingExpense, setAddingExpense] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const spaces = data?.joined ?? []
  const space = spaces.find((s) => s.id === selectedId) ?? spaces[0] ?? null
  const { data: ledger } = useSpaceLedger(space?.id ?? null)

  const summary = useMemo(() => {
    if (!space || !ledger) return null
    const result = balances(ledger.expenses, ledger.settlements, space.memberUids)
    return { balances: result, transfers: settleUp(result) }
  }, [space, ledger])

  const isOwner = !!space && space.ownerUid === user?.uid

  async function settle(transfer: Transfer) {
    if (!space) return
    try {
      await addSettlement.mutateAsync({
        spaceId: space.id,
        settlement: {
          fromUid: transfer.fromUid,
          toUid: transfer.toUid,
          amountCents: transfer.cents,
          date: todayDateString(),
        },
      })
      toast.success("Acerto registrado")
    } catch {
      toast.error("Não foi possível registrar")
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Compartilhado</h1>
        {space ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setInviting(true)}>
              <UserPlus className="size-4" />
              Convidar
            </Button>
            <Button size="sm" onClick={() => setAddingExpense(true)}>
              <Plus className="size-4" />
              Nova despesa
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Criar espaço
          </Button>
        )}
      </div>

      {!!data?.invited.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Convites para você
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.invited.map((invited) => (
              <div key={invited.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm">{invited.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await acceptInvite.mutateAsync(invited)
                      toast.success("Você entrou no espaço")
                    } catch {
                      toast.error("Não foi possível entrar")
                    }
                  }}
                >
                  Entrar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!space ? (
        <Card>
          <CardContent className="grid gap-2 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Users className="size-4" />
              Um espaço para as contas de casa, da viagem, do grupo
            </p>
            <p className="text-muted-foreground">
              Só o que você lançar aqui fica visível para os outros participantes. Suas contas,
              cartões e lançamentos continuam seus e invisíveis para eles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {spaces.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {spaces.map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant={option.id === space.id ? "default" : "outline"}
                  onClick={() => setSelectedId(option.id)}
                >
                  {option.name}
                </Button>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">{space.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {summary && (
                <SpaceBalances
                  balances={summary.balances}
                  transfers={summary.transfers}
                  members={space.members}
                  currentUid={user?.uid ?? ""}
                  onSettle={settle}
                />
              )}
              <div className="grid gap-1">
                <p className="text-muted-foreground text-xs">
                  Participantes: {space.members.map((m) => m.name ?? m.email).join(", ")}
                  {space.pendingEmails.length > 0 &&
                    ` · convidados: ${space.pendingEmails.join(", ")}`}
                </p>
                {isOwner && space.members.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {space.members
                      .filter((m) => m.uid !== user?.uid)
                      .map((member) => (
                        <Button
                          key={member.uid}
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await removeMember.mutateAsync({ space, uid: member.uid })
                              toast.success("Participante removido")
                            } catch {
                              toast.error("Não foi possível remover")
                            }
                          }}
                        >
                          <UserMinus className="size-3.5" />
                          Remover {member.name ?? member.email}
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <SharedExpenseList
            expenses={ledger?.expenses ?? []}
            members={space.members}
            currentUid={user?.uid ?? ""}
          />

          <SharedExpenseDialog
            key={space.id}
            members={space.members}
            currentUid={user?.uid ?? ""}
            open={addingExpense}
            onOpenChange={setAddingExpense}
            submitting={addExpense.isPending}
            onSubmit={async (expense) => {
              await addExpense.mutateAsync({ spaceId: space.id, expense })
              toast.success("Despesa lançada")
            }}
          />
        </>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar espaço compartilhado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-muted-foreground text-sm">
              Um espaço guarda apenas as despesas lançadas nele. Nada das suas contas, cartões
              ou lançamentos é compartilhado.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="espaco-nome">Nome</Label>
              <Input
                id="espaco-nome"
                autoFocus
                placeholder="Casa"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
              />
            </div>
            <Button
              disabled={createSpace.isPending}
              onClick={async () => {
                try {
                  await createSpace.mutateAsync(spaceName)
                  toast.success("Espaço criado")
                  setCreating(false)
                  setSpaceName("")
                } catch {
                  toast.error("Não foi possível criar")
                }
              }}
            >
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar participante</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-muted-foreground text-sm">
              O convite vale para quem entrar com esse e-mail. Ele só vira acesso quando a
              pessoa aceitar, e pode ser revogado a qualquer momento.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="convite-email">E-mail</Label>
              <Input
                id="convite-email"
                type="email"
                autoFocus
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Button
              disabled={invite.isPending}
              onClick={async () => {
                if (!space) return
                try {
                  await invite.mutateAsync({ spaceId: space.id, email: inviteEmail })
                  toast.success("Convite enviado")
                  setInviting(false)
                  setInviteEmail("")
                } catch {
                  toast.error("Não foi possível convidar")
                }
              }}
            >
              Convidar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
