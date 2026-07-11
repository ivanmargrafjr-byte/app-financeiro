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
import {
  cardTransactionEditSchema,
  type CardTransactionEditFormInput,
  type CardTransactionEditFormValues,
} from "@/lib/validators/cardTransactionEdit"

export function CardTransactionEditForm({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
}: {
  defaultValues: CardTransactionEditFormInput
  submitLabel: string
  submitting: boolean
  onSubmit: (values: CardTransactionEditFormValues) => void
}) {
  const { data: categories } = useCategories()
  const despesaCategories = categories?.filter((c) => c.type === "despesa")
  const categoryTree = flattenCategoryTree(despesaCategories ?? [])

  const form = useForm<CardTransactionEditFormInput, unknown, CardTransactionEditFormValues>({
    resolver: zodResolver(cardTransactionEditSchema),
    defaultValues,
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
        <p className="text-muted-foreground text-xs">
          Se a data mudar para fora do ciclo atual, o lançamento é movido para a fatura correta
          automaticamente.
        </p>
        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </form>
    </Form>
  )
}
