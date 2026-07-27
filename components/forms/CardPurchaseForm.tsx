"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EntityIcon } from "@/components/forms/EntityIcon"
import { useCategories } from "@/lib/hooks/useCategories"
import { flattenCategoryTree } from "@/lib/domain/categoryTree"
import { todayDateString } from "@/lib/domain/dateUtils"
import { formatCentsBRL, splitCents, toCents } from "@/lib/domain/money"
import {
  cardPurchaseSchema,
  type CardPurchaseFormInput,
  type CardPurchaseFormValues,
} from "@/lib/validators/cardPurchase"

type ExtractedReceipt = {
  description: string | null
  amount: number | null
  date: string | null
}

export function CardPurchaseForm({
  submitLabel,
  submitting,
  onSubmit,
}: {
  submitLabel: string
  submitting: boolean
  onSubmit: (values: CardPurchaseFormValues) => void
}) {
  const { data: categories } = useCategories()
  const despesaCategories = categories?.filter((c) => c.type === "despesa")
  const categoryTree = flattenCategoryTree(despesaCategories ?? [])
  const [extracting, setExtracting] = useState(false)

  const form = useForm<CardPurchaseFormInput, unknown, CardPurchaseFormValues>({
    resolver: zodResolver(cardPurchaseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      categoryId: "",
      date: todayDateString(),
      installmentTotal: 1,
      interestAmount: 0,
    },
  })
  const amount = form.watch("amount")
  const installmentTotal = form.watch("installmentTotal")
  const interestAmount = form.watch("interestAmount")
  const isInstallment = Number(installmentTotal) > 1

  async function handleReceiptChange(selected: File | undefined) {
    if (!selected) return
    setExtracting(true)
    try {
      const body = new FormData()
      body.append("file", selected)
      const res = await fetch("/api/receipts/extract", { method: "POST", body })
      if (!res.ok) throw new Error("extraction failed")

      const data: ExtractedReceipt = await res.json()
      if (data.description) form.setValue("description", data.description)
      if (data.amount != null) form.setValue("amount", data.amount)
      if (data.date) form.setValue("date", data.date)
      toast.success("Dados extraídos do recibo — revise antes de salvar")
    } catch {
      toast.error("Não foi possível ler o recibo automaticamente. Preencha os campos manualmente.")
    } finally {
      setExtracting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-2">
          <Label>Ler recibo (opcional)</Label>
          <Input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleReceiptChange(e.target.files?.[0])}
          />
          {extracting && (
            <p className="text-muted-foreground text-xs">
              Lendo o recibo e preenchendo os campos...
            </p>
          )}
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Loja X" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} value={field.value as number | string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da compra</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="installmentTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parcelas</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    {...field}
                    value={field.value as number | string}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {isInstallment && (
            <FormField
              control={form.control}
              name="interestAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Juros total (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      {...field}
                      value={field.value as number | string}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        {isInstallment && Number(amount) > 0 && (
          <p className="text-muted-foreground text-xs">
            Total com juros: {formatCentsBRL(toCents(Number(amount)) + toCents(Number(interestAmount) || 0))}{" "}
            — {Number(installmentTotal)}x de{" "}
            {formatCentsBRL(
              splitCents(
                toCents(Number(amount)) + toCents(Number(interestAmount) || 0),
                Number(installmentTotal)
              )[0]
            )}
          </p>
        )}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a categoria">
                      {(value: string) => despesaCategories?.find((c) => c.id === value)?.name}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoryTree.map(({ category, depth }) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span
                        className="flex items-center gap-2"
                        style={{ paddingLeft: depth * 16 }}
                      >
                        <EntityIcon
                          name={category.icon}
                          color={category.color}
                          imageUrl={category.iconUrl}
                        />
                        {category.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting || extracting} className="mt-2">
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </form>
    </Form>
  )
}
