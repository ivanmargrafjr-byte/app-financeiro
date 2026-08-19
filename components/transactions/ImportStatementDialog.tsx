"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { flattenCategoryTree } from "@/lib/domain/categoryTree"
import { formatCentsBRL } from "@/lib/domain/money"
import { suggestCategoryId } from "@/lib/domain/categorySuggestion"
import { decodeOfxBytes, parseOfx, type OfxStatement } from "@/lib/domain/ofx"
import {
  isSelectedByDefault,
  matchOfxTransactions,
  type OfxMatchKind,
} from "@/lib/domain/ofxImportMatch"
import { useCategories } from "@/lib/hooks/useCategories"
import { useAccountTransactions, useImportOfxTransactions } from "@/lib/hooks/useTransactions"
import { cn } from "@/lib/utils"
import type { Account } from "@/lib/types"

type DraftRow = {
  id: string
  fitId: string
  date: string
  direction: "in" | "out"
  amountCents: number
  description: string
  categoryId: string
  included: boolean
  kind: OfxMatchKind
  /** The pendente this row will efetivar, when that's what it does. */
  settleTransactionId: string | null
  /** Description of the lançamento it matched, so the user can judge the match. */
  matchedDescription: string | null
}

const KIND_LABEL: Record<OfxMatchKind, string | null> = {
  new: null,
  "matches-pending": "Efetiva um pendente",
  "already-settled": "Já lançado",
  "already-imported": "Já importado",
}

function CategorySelect({
  value,
  onChange,
  direction,
}: {
  value: string
  onChange: (value: string) => void
  direction: "in" | "out"
}) {
  const { data: categories } = useCategories()
  // A credit can only be a receita and a debit only a despesa — offering both
  // would let the dashboard count an entrada under an expense category.
  const type = direction === "in" ? "receita" : "despesa"
  const eligible = categories?.filter((c) => c.type === type)
  const categoryTree = flattenCategoryTree(eligible ?? [])

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Categoria">
          {(v: string) => eligible?.find((c) => c.id === v)?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {categoryTree.map(({ category, depth }) => (
          <SelectItem key={category.id} value={category.id}>
            <span className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
              <EntityIcon name={category.icon} color={category.color} imageUrl={category.iconUrl} />
              {category.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ImportStatementDialog({
  account,
  open,
  onOpenChange,
}: {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: categories } = useCategories()
  const { data: accountTransactions } = useAccountTransactions(account.id)
  const importOfx = useImportOfxTransactions()

  const [rows, setRows] = useState<DraftRow[]>([])
  const [statement, setStatement] = useState<OfxStatement | null>(null)

  function reset() {
    setRows([])
    setStatement(null)
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return
    try {
      const parsed = parseOfx(decodeOfxBytes(await file.arrayBuffer()))
      if (parsed.transactions.length === 0) {
        toast.error("Nenhum lançamento encontrado nesse extrato")
        return
      }

      const existing = accountTransactions ?? []
      const matches = matchOfxTransactions(
        parsed.transactions,
        existing.map((tx) => ({
          id: tx.id,
          description: tx.description,
          amountCents: tx.amountCents,
          direction: tx.direction,
          date: tx.date,
          settled: tx.settled,
          ofxFitId: tx.ofxFitId,
        }))
      )

      // What the user has classified in this account before is the whole basis for
      // the suggestions — a new account simply gets none, and gains them as it fills.
      const history = existing
        .filter((tx) => tx.categoryId)
        .map((tx) => ({
          description: tx.description,
          categoryId: tx.categoryId,
          direction: tx.direction,
          createdAt: tx.createdAt,
        }))

      setStatement(parsed)
      setRows(
        matches.map((match, i) => {
          const direction = match.movement.amountCents < 0 ? ("out" as const) : ("in" as const)
          const matched = existing.find((tx) => tx.id === match.matchedId)
          return {
            id: `${match.movement.fitId}-${i}`,
            fitId: match.movement.fitId,
            date: match.movement.date,
            direction,
            amountCents: Math.abs(match.movement.amountCents),
            description: match.movement.description,
            categoryId:
              suggestCategoryId(match.movement.description, direction, history) ?? "",
            included: isSelectedByDefault(match.kind),
            kind: match.kind,
            settleTransactionId:
              match.kind === "matches-pending" ? (match.matchedId ?? null) : null,
            matchedDescription: matched?.description ?? null,
          }
        })
      )
      toast.success(`${matches.length} lançamentos lidos — revise antes de importar`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível ler o arquivo OFX"
      )
    }
  }

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const includedRows = rows.filter((row) => row.included)
  // A row that only efetiva a pendente keeps that lançamento's own category.
  const rowsNeedingCategory = includedRows.filter((row) => !row.settleTransactionId)
  const missingCategory = rowsNeedingCategory.filter((row) => !row.categoryId)
  const canImport = includedRows.length > 0 && missingCategory.length === 0

  const counts = {
    create: rowsNeedingCategory.length,
    settle: includedRows.length - rowsNeedingCategory.length,
    skipped: rows.length - includedRows.length,
  }

  async function handleImport() {
    if (!canImport) return
    try {
      await importOfx.mutateAsync({
        accountId: account.id,
        entries: includedRows.map((row) => ({
          fitId: row.fitId,
          date: row.date,
          direction: row.direction,
          amountCents: row.amountCents,
          description: row.description.trim() || "Lançamento",
          category: categories?.find((c) => c.id === row.categoryId) ?? null,
          settleTransactionId: row.settleTransactionId ?? undefined,
        })),
      })
      toast.success(
        [
          counts.create > 0 && `${counts.create} lançamento${counts.create === 1 ? "" : "s"} criado${counts.create === 1 ? "" : "s"}`,
          counts.settle > 0 && `${counts.settle} efetivado${counts.settle === 1 ? "" : "s"}`,
        ]
          .filter(Boolean)
          .join(", ")
      )
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar o extrato")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar extrato</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2">
          <Label>Arquivo do extrato (OFX)</Label>
          <Input
            type="file"
            accept=".ofx,application/x-ofx,application/vnd.intu.qfx"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />
          <p className="text-muted-foreground text-xs">
            Exporte o extrato em OFX no app ou no site do seu banco — é o formato que traz o
            identificador de cada lançamento, o que evita importar duas vezes o mesmo movimento.
          </p>
        </div>

        {rows.length > 0 && (
          <>
            <div className="text-muted-foreground grid grid-cols-1 gap-1 text-xs">
              <p>
                {counts.create} para criar · {counts.settle} pendente
                {counts.settle === 1 ? "" : "s"} para efetivar · {counts.skipped} desmarcado
                {counts.skipped === 1 ? "" : "s"}
              </p>
              {statement?.ledgerBalanceCents != null && (
                <p>
                  Saldo do extrato
                  {statement.ledgerBalanceDate &&
                    ` em ${statement.ledgerBalanceDate.split("-").reverse().join("/")}`}
                  : {formatCentsBRL(statement.ledgerBalanceCents)} · saldo da conta hoje:{" "}
                  {formatCentsBRL(account.currentBalanceCents)}
                </p>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={!row.included ? "opacity-50" : undefined}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(e) => updateRow(row.id, { included: e.target.checked })}
                        className="size-4"
                        aria-label="Incluir na importação"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.date.split("-").reverse().join("/")}
                    </TableCell>
                    <TableCell>
                      {KIND_LABEL[row.kind] && (
                        <Badge variant="secondary" className="mb-1 text-xs">
                          {KIND_LABEL[row.kind]}
                        </Badge>
                      )}
                      <Input
                        value={row.description}
                        onChange={(e) => updateRow(row.id, { description: e.target.value })}
                        className="min-w-48"
                        disabled={!!row.settleTransactionId}
                      />
                      {row.matchedDescription && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {row.settleTransactionId ? "Efetiva" : "Igual a"}: {row.matchedDescription}
                        </p>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right whitespace-nowrap tabular-nums",
                        row.direction === "in" ? "text-emerald-600" : undefined
                      )}
                    >
                      {row.direction === "out" ? "−" : "+"}
                      {formatCentsBRL(row.amountCents)}
                    </TableCell>
                    <TableCell>
                      {row.settleTransactionId ? (
                        <span className="text-muted-foreground text-xs">
                          Mantém a do lançamento
                        </span>
                      ) : (
                        <div
                          className={cn(
                            "w-44 rounded-md",
                            row.included && !row.categoryId && "ring-destructive ring-1"
                          )}
                        >
                          <CategorySelect
                            value={row.categoryId}
                            onChange={(v) => updateRow(row.id, { categoryId: v })}
                            direction={row.direction}
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button onClick={handleImport} disabled={!canImport || importOfx.isPending} className="mt-2">
              {importOfx.isPending
                ? "Importando..."
                : `Importar ${includedRows.length} lançamento${includedRows.length === 1 ? "" : "s"}`}
            </Button>
            {includedRows.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Marque ao menos um lançamento para importar.
              </p>
            )}
            {missingCategory.length > 0 && (
              <p className="text-destructive text-xs">
                {missingCategory.length} lançamento{missingCategory.length === 1 ? "" : "s"} sem
                categoria (destacado{missingCategory.length === 1 ? "" : "s"} em vermelho acima).
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
