"use client"

import { useMemo, useState } from "react"
import { PiggyBank, Pencil, Plus, Trash2 } from "lucide-react"
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
import { Amount } from "@/components/home/Amount"
import { BudgetLines } from "@/components/budgets/BudgetLines"
import { GoalDialog } from "@/components/budgets/GoalDialog"
import { GoalList } from "@/components/budgets/GoalList"
import { SaveIntoGoalDialog } from "@/components/budgets/SaveIntoGoalDialog"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { useCategories } from "@/lib/hooks/useCategories"
import { useArchivedCards } from "@/lib/hooks/useCards"
import { useMonthTransactions } from "@/lib/hooks/useTransactions"
import { useBudgets, useDeleteBudget, useSetBudget } from "@/lib/hooks/useBudgets"
import {
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useSaveIntoGoal,
  useUpdateGoal,
  type GoalInput,
} from "@/lib/hooks/useGoals"
import { useMonth } from "@/lib/month/MonthProvider"
import { useFocusedIds, useScrollToFocus } from "@/lib/navigation/FocusProvider"
import { buildBudgetLines, sumBudgets } from "@/lib/domain/budget"
import { sumMonthly, sumSaved, type Goal, type GoalKind } from "@/lib/domain/goals"
import { monthLabel, todayDateString } from "@/lib/domain/dateUtils"
import { fromCents, toCents } from "@/lib/domain/money"
import type { Category } from "@/lib/types"

export default function OrcamentosPage() {
  const { month } = useMonth()
  const [today] = useState(() => todayDateString())
  const { data: categories, isLoading: loadingCategories } = useCategories()
  const { data: transactions, isLoading: loadingTransactions } = useMonthTransactions(month)
  const { data: archivedCards } = useArchivedCards()
  const { data: budgets, isLoading: loadingBudgets } = useBudgets()
  const setBudget = useSetBudget()
  const deleteBudget = useDeleteBudget()

  const { data: goals } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const saveIntoGoal = useSaveIntoGoal()

  const [goalDialog, setGoalDialog] = useState<{ kind: GoalKind; goal: Goal | null } | null>(null)
  const [saving, setSaving] = useState<Goal | null>(null)
  const [editing, setEditing] = useState<Category | null>(null)
  const [value, setValue] = useState("")
  const [picking, setPicking] = useState(false)

  const isLoading = loadingCategories || loadingTransactions || loadingBudgets

  // An alert can land here pointing at one category's limit or at one goal.
  const focusedIds = useFocusedIds()
  useScrollToFocus(!isLoading && goals != null)

  const lines = useMemo(
    () =>
      buildBudgetLines({
        budgets: budgets ?? [],
        categories: categories ?? [],
        transactions: transactions ?? [],
        archivedCardsById: new Map((archivedCards ?? []).map((c) => [c.id, c])),
        month,
        today,
      }),
    [budgets, categories, transactions, archivedCards, month, today]
  )
  const totals = sumBudgets(lines)

  const metas = (goals ?? []).filter((g) => g.kind === "meta")
  const anuais = (goals ?? []).filter((g) => g.kind === "anual")
  const savedTotal = sumSaved(goals ?? [])
  const monthlyEffort = sumMonthly(goals ?? [], today)

  async function submitGoal(input: GoalInput) {
    if (goalDialog?.goal) await updateGoal.mutateAsync({ id: goalDialog.goal.id, ...input })
    else await createGoal.mutateAsync(input)
    toast.success("Salvo")
  }

  const withoutBudget = (categories ?? []).filter(
    (c) => c.type === "despesa" && !budgets?.some((b) => b.categoryId === c.id)
  )

  function startEditing(category: Category, limitCents: number) {
    setEditing(category)
    setValue(limitCents > 0 ? String(fromCents(limitCents)) : "")
    setPicking(false)
  }

  async function save() {
    if (!editing) return
    const reais = Number(value.replace(",", "."))
    if (!Number.isFinite(reais) || reais <= 0) {
      toast.error("Informe um valor maior que zero")
      return
    }
    try {
      await setBudget.mutateAsync({ categoryId: editing.id, limitCents: toCents(reais) })
      toast.success("Limite salvo")
      setEditing(null)
    } catch {
      toast.error("Não foi possível salvar o limite")
    }
  }

  async function remove(categoryId: string) {
    try {
      await deleteBudget.mutateAsync(categoryId)
      toast.success("Limite removido")
      setEditing(null)
    } catch {
      toast.error("Não foi possível remover o limite")
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Orçamentos</h1>
        <Button onClick={() => setPicking(true)} disabled={withoutBudget.length === 0}>
          <Plus className="size-4" />
          Novo limite
        </Button>
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium capitalize">
                {monthLabel(month)}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1">
              <p className="text-sm">
                <Amount cents={totals.spentCents} size="sm" /> gastos de{" "}
                <Amount cents={totals.limitCents} size="sm" /> orçados
              </p>
              <p
                className={
                  totals.remainingCents < 0
                    ? "text-destructive text-sm"
                    : "text-muted-foreground text-sm"
                }
              >
                {totals.remainingCents >= 0 ? (
                  <>
                    <Amount cents={totals.remainingCents} size="sm" /> disponíveis no total
                  </>
                ) : (
                  <>
                    <Amount cents={Math.abs(totals.remainingCents)} size="sm" /> acima do total
                    orçado
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <BudgetLines
            lines={lines}
            focusedIds={focusedIds}
            action={(line) => (
              <button
                type="button"
                aria-label={`Ajustar limite de ${line.category.name}`}
                onClick={() => startEditing(line.category, line.limitCents)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          />
        </>
      )}

      <div className="mt-2 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Metas</h2>
          <Button variant="outline" size="sm" onClick={() => setGoalDialog({ kind: "meta", goal: null })}>
            <Plus className="size-4" />
            Nova meta
          </Button>
        </div>
        <GoalList
          goals={metas}
          today={today}
          focusedIds={focusedIds}
          emptyLabel="Nenhuma meta ainda. Diga quanto quer juntar e até quando, e o app calcula o quanto guardar por mês."
          action={(goal) => (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Guardar em ${goal.name}`}
                onClick={() => setSaving(goal)}
                className="text-muted-foreground hover:text-foreground"
              >
                <PiggyBank className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Editar ${goal.name}`}
                onClick={() => setGoalDialog({ kind: goal.kind, goal })}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            </span>
          )}
        />
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Despesas anuais</h2>
          <Button variant="outline" size="sm" onClick={() => setGoalDialog({ kind: "anual", goal: null })}>
            <Plus className="size-4" />
            Nova despesa
          </Button>
        </div>
        <GoalList
          goals={anuais}
          today={today}
          focusedIds={focusedIds}
          emptyLabel="Seguro, IPVA, matrícula: cadastre o valor e a data, e o app mostra quanto separar por mês para não ser pego de surpresa."
          action={(goal) => (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Guardar em ${goal.name}`}
                onClick={() => setSaving(goal)}
                className="text-muted-foreground hover:text-foreground"
              >
                <PiggyBank className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Editar ${goal.name}`}
                onClick={() => setGoalDialog({ kind: goal.kind, goal })}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            </span>
          )}
        />
        {(metas.length > 0 || anuais.length > 0) && (
          <p className="text-muted-foreground text-xs">
            Guardado no total: <Amount cents={savedTotal} size="sm" /> · esforço deste mês:{" "}
            <Amount cents={monthlyEffort} size="sm" />. O dinheiro continua nas suas contas — ele
            só deixa de contar como livre para gastar na tela de início.
          </p>
        )}
      </div>

      <SaveIntoGoalDialog
        key={`guardar-${saving?.id ?? "none"}`}
        goal={saving}
        today={today}
        open={!!saving}
        onOpenChange={(open) => !open && setSaving(null)}
        submitting={saveIntoGoal.isPending}
        onSave={async (deltaCents) => {
          if (saving) await saveIntoGoal.mutateAsync({ id: saving.id, deltaCents })
        }}
      />

      <GoalDialog
        key={`meta-${goalDialog?.goal?.id ?? goalDialog?.kind ?? "none"}`}
        kind={goalDialog?.kind ?? "meta"}
        goal={goalDialog?.goal}
        open={!!goalDialog}
        onOpenChange={(open) => !open && setGoalDialog(null)}
        onSubmit={submitGoal}
        submitting={createGoal.isPending || updateGoal.isPending}
        onDelete={
          goalDialog?.goal
            ? async () => {
                await deleteGoal.mutateAsync(goalDialog.goal!.id)
                toast.success("Excluído")
                setGoalDialog(null)
              }
            : undefined
        }
      />

      <Dialog open={picking} onOpenChange={setPicking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha a categoria</DialogTitle>
          </DialogHeader>
          <ul className="grid max-h-80 gap-1 overflow-y-auto">
            {withoutBudget.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => startEditing(category, 0)}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
                >
                  <EntityIcon
                    name={category.icon}
                    color={category.color}
                    imageUrl={category.iconUrl}
                  />
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limite de {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <p className="text-muted-foreground text-sm">
              Quanto você pretende gastar nesta categoria por mês. O limite vale para todos os
              meses, e o acompanhamento segue o mês que você está vendo.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="limite">Valor (R$)</Label>
              <Input
                id="limite"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={setBudget.isPending} className="flex-1">
                {setBudget.isPending ? "Salvando..." : "Salvar"}
              </Button>
              {!!budgets?.some((b) => b.categoryId === editing?.id) && (
                <Button
                  variant="outline"
                  onClick={() => editing && remove(editing.id)}
                  disabled={deleteBudget.isPending}
                >
                  <Trash2 className="size-4" />
                  Remover
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
