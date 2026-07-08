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
import { useAccounts } from "@/lib/hooks/useAccounts"
import { useCategories } from "@/lib/hooks/useCategories"
import { flattenCategoryTree } from "@/lib/domain/categoryTree"
import { todayDateString } from "@/lib/domain/dateUtils"
import {
  accountTransactionSchema,
  type AccountTransactionFormInput,
  type AccountTransactionFormValues,
} from "@/lib/validators/transaction"

export function TransactionForm({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
}: {
  defaultValues?: Partial<AccountTransactionFormInput>
  submitLabel: string
  submitting: boolean
  onSubmit: (values: AccountTransactionFormValues) => void
}) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()

  const form = useForm<AccountTransactionFormInput, unknown, AccountTransactionFormValues>({
    resolver: zodResolver(accountTransactionSchema),
    defaultValues: {
      description: "",
      amount: 0,
      direction: "out",
      categoryId: "",
      accountId: "",
      date: todayDateString(),
      ...defaultValues,
    },
  })

  const direction = form.watch("direction")
  const filteredCategories = categories?.filter(
    (c) => c.type === (direction === "in" ? "receita" : "despesa")
  )
  const categoryTree = flattenCategoryTree(filteredCategories ?? [])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  form.setValue("categoryId", "")
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => (value === "in" ? "Receita" : "Despesa")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="out">Despesa</SelectItem>
                  <SelectItem value="in">Receita</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Supermercado" {...field} />
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
                <FormLabel>Data</FormLabel>
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
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conta</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a conta">
                      {(value: string) => accounts?.find((a) => a.id === value)?.name}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      {(value: string) =>
                        filteredCategories?.find((c) => c.id === value)?.name
                      }
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
