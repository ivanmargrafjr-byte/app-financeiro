"use client"

import { useState } from "react"
import { toast } from "sonner"

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
import { useCategories } from "@/lib/hooks/useCategories"
import { flattenCategoryTree } from "@/lib/domain/categoryTree"
import { useImportInvoiceLineItems } from "@/lib/hooks/useInvoices"
import { toCents } from "@/lib/domain/money"
import { cn } from "@/lib/utils"
import type { Card as CardEntity, Invoice } from "@/lib/types"

type DraftItem = {
  id: string
  description: string
  amount: string
  date: string
  categoryId: string
  installmentNumber: string
  installmentTotal: string
  included: boolean
}

type ExtractedInvoiceLineItem = {
  description: string
  amount: number
  date: string | null
  installmentNumber: number | null
  installmentTotal: number | null
}

function CategorySelect({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const { data: categories } = useCategories()
  const despesaCategories = categories?.filter((c) => c.type === "despesa")
  const categoryTree = flattenCategoryTree(despesaCategories ?? [])

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {(v: string) => despesaCategories?.find((c) => c.id === v)?.name}
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

export function ImportInvoiceDialog({
  invoice,
  card,
  open,
  onOpenChange,
}: {
  invoice: Invoice
  card: CardEntity
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: categories } = useCategories()
  const importItems = useImportInvoiceLineItems()

  const [extracting, setExtracting] = useState(false)
  const [items, setItems] = useState<DraftItem[]>([])
  const [defaultCategoryId, setDefaultCategoryId] = useState("")

  function reset() {
    setItems([])
    setDefaultCategoryId("")
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return
    setExtracting(true)
    setItems([])
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("referenceMonth", invoice.referenceMonth)
      const res = await fetch("/api/invoices/extract", { method: "POST", body })
      if (!res.ok) throw new Error("extraction failed")

      const data: { items: ExtractedInvoiceLineItem[] } = await res.json()
      if (data.items.length === 0) {
        toast.error("Nenhum lançamento encontrado nesse arquivo")
        return
      }
      // Pre-fill every row with a sensible default category so the import button
      // can enable right away — the user can still override any row individually.
      const fallbackCategoryId = categories?.find((c) => c.type === "despesa")?.id ?? ""
      setDefaultCategoryId(fallbackCategoryId)
      setItems(
        data.items.map((item, i) => ({
          id: `${i}-${Date.now()}`,
          description: item.description,
          amount: item.amount.toFixed(2),
          date: item.date ?? invoice.closingDate,
          categoryId: fallbackCategoryId,
          installmentNumber: item.installmentNumber != null ? String(item.installmentNumber) : "",
          installmentTotal: item.installmentTotal != null ? String(item.installmentTotal) : "",
          included: true,
        }))
      )
      toast.success(`${data.items.length} lançamentos encontrados — revise antes de importar`)
    } catch {
      toast.error("Não foi possível ler a fatura automaticamente")
    } finally {
      setExtracting(false)
    }
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function handleDefaultCategoryChange(value: string) {
    setDefaultCategoryId(value)
    // Applies immediately to every row — no separate "apply" step to miss.
    setItems((prev) => prev.map((item) => ({ ...item, categoryId: value })))
  }

  const includedItems = items.filter((i) => i.included)
  const invalidIncludedItems = includedItems.filter(
    (i) => !i.description.trim() || !(Number(i.amount) > 0) || !i.date || !i.categoryId
  )
  const canImport = includedItems.length > 0 && invalidIncludedItems.length === 0

  async function handleImport() {
    if (!canImport) return
    try {
      await importItems.mutateAsync({
        invoice,
        card,
        items: includedItems.map((i) => {
          const category = categories!.find((c) => c.id === i.categoryId)!
          return {
            description: i.description.trim(),
            amountCents: toCents(Number(i.amount)),
            date: i.date,
            category,
            installmentNumber: i.installmentNumber ? Number(i.installmentNumber) : undefined,
            installmentTotal: i.installmentTotal ? Number(i.installmentTotal) : undefined,
          }
        }),
      })
      toast.success(`${includedItems.length} lançamentos importados`)
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar")
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
          <DialogTitle>Importar fatura</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Label>Arquivo da fatura (PDF ou imagem)</Label>
          <Input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />
          {extracting && (
            <p className="text-muted-foreground text-xs">
              Lendo a fatura, pode levar alguns segundos...
            </p>
          )}
        </div>

        {items.length > 0 && (
          <>
            <div className="grid gap-2">
              <Label>Categoria padrão</Label>
              <CategorySelect
                value={defaultCategoryId}
                onChange={handleDefaultCategoryChange}
                placeholder="Selecione uma categoria"
              />
              <p className="text-muted-foreground text-xs">
                Aplicada a todos os itens abaixo — ajuste linha a linha o que for diferente.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Categoria</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={!item.included ? "opacity-50" : undefined}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={(e) => updateItem(item.id, { included: e.target.checked })}
                        className="size-4"
                        aria-label="Incluir na importação"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        className={cn("min-w-40", !item.description.trim() && "border-destructive")}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                        className={cn("w-24", !(Number(item.amount) > 0) && "border-destructive")}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateItem(item.id, { date: e.target.value })}
                        className={cn("w-36", !item.date && "border-destructive")}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          placeholder="—"
                          value={item.installmentNumber}
                          onChange={(e) =>
                            updateItem(item.id, { installmentNumber: e.target.value })
                          }
                          className="w-14"
                        />
                        <span className="text-muted-foreground">/</span>
                        <Input
                          type="number"
                          min={1}
                          placeholder="—"
                          value={item.installmentTotal}
                          onChange={(e) => updateItem(item.id, { installmentTotal: e.target.value })}
                          className="w-14"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("w-44 rounded-md", !item.categoryId && "ring-1 ring-destructive")}>
                        <CategorySelect
                          value={item.categoryId}
                          onChange={(v) => updateItem(item.id, { categoryId: v })}
                          placeholder="Categoria"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button
              onClick={handleImport}
              disabled={!canImport || importItems.isPending}
              className="mt-2"
            >
              {importItems.isPending
                ? "Importando..."
                : `Importar ${includedItems.length} lançamento${includedItems.length === 1 ? "" : "s"}`}
            </Button>
            {includedItems.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Marque ao menos um lançamento para importar.
              </p>
            )}
            {includedItems.length > 0 && invalidIncludedItems.length > 0 && (
              <p className="text-destructive text-xs">
                {invalidIncludedItems.length} lançamento
                {invalidIncludedItems.length === 1 ? "" : "s"} marcado
                {invalidIncludedItems.length === 1 ? "" : "s"} com descrição, valor, data ou
                categoria em falta (destacado{invalidIncludedItems.length === 1 ? "" : "s"} em
                vermelho acima).
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
