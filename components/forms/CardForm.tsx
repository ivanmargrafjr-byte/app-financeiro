"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { ColorSwatchPicker } from "@/components/forms/ColorSwatchPicker"
import { IconPicker } from "@/components/forms/IconPicker"
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
import { COLOR_PALETTE } from "@/lib/colorPalette"
import { DEFAULT_ICON_NAME } from "@/lib/iconRegistry"
import { useAccounts } from "@/lib/hooks/useAccounts"
import { cardSchema, type CardFormInput, type CardFormValues } from "@/lib/validators/card"

export function CardForm({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
}: {
  defaultValues?: Partial<CardFormInput>
  submitLabel: string
  submitting: boolean
  onSubmit: (values: CardFormValues) => void
}) {
  const { data: accounts } = useAccounts()

  const form = useForm<CardFormInput, unknown, CardFormValues>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      limit: 0,
      closingDay: 1,
      dueDay: 10,
      linkedAccountId: "",
      icon: DEFAULT_ICON_NAME,
      color: COLOR_PALETTE[8],
      ...defaultValues,
    },
  })

  const color = form.watch("color")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Nubank" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite (R$)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} value={field.value as number | string} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="closingDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia de fechamento</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={31} {...field} value={field.value as number | string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia de vencimento</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={31} {...field} value={field.value as number | string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="linkedAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conta para pagamento da fatura</FormLabel>
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
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cor</FormLabel>
              <FormControl>
                <ColorSwatchPicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ícone</FormLabel>
              <FormControl>
                <IconPicker value={field.value} color={color} onChange={field.onChange} />
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
