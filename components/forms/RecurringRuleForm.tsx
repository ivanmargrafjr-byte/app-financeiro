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
import { currentMonthString } from "@/lib/domain/dateUtils"
import {
  recurringRuleSchema,
  type RecurringRuleFormInput,
  type RecurringRuleFormValues,
} from "@/lib/validators/recurringRule"

export function RecurringRuleForm({
  submitLabel,
  submitting,
  onSubmit,
}: {
  submitLabel: string
  submitting: boolean
  onSubmit: (values: RecurringRuleFormValues) => void
}) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()

  const form = useForm<RecurringRuleFormInput, unknown, RecurringRuleFormValues>({
    resolver: zodResolver(recurringRuleSchema),
    defaultValues: {
      description: "",
      amount: 0,
      direction: "out",
      categoryId: "",
      accountId: "",
      dayOfMonth: 5,
      startMonth: currentMonthString(),
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
                <Input placeholder="Ex: Assinatura streaming" {...field} />
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
            name="dayOfMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia do mês</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    {...field}
                    value={field.value as number | string}
                  />
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
        <FormField
          control={form.control}
          name="startMonth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Começa em</FormLabel>
              <FormControl>
                <Input type="month" {...field} />
              </FormControl>
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
