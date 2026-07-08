"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

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
import {
  cardPurchaseSchema,
  type CardPurchaseFormInput,
  type CardPurchaseFormValues,
} from "@/lib/validators/cardPurchase"

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

  const form = useForm<CardPurchaseFormInput, unknown, CardPurchaseFormValues>({
    resolver: zodResolver(cardPurchaseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      categoryId: "",
      date: todayDateString(),
      installmentTotal: 1,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
        <FormField
          control={form.control}
          name="installmentTotal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parcelas</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={48}
                  {...field}
                  value={field.value as number | string}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                        <EntityIcon name={category.icon} color={category.color} />
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
        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </form>
    </Form>
  )
}
