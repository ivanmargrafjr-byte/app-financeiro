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
import { ACCOUNT_TYPE_LABELS } from "@/lib/types"
import {
  accountSchema,
  type AccountFormInput,
  type AccountFormValues,
} from "@/lib/validators/account"

export function AccountForm({
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
}: {
  defaultValues?: Partial<AccountFormInput>
  submitLabel: string
  submitting: boolean
  onSubmit: (values: AccountFormValues) => void
}) {
  const form = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      type: "corrente",
      initialBalance: 0,
      icon: DEFAULT_ICON_NAME,
      iconUrl: undefined,
      color: COLOR_PALETTE[7],
      ...defaultValues,
    },
  })

  const color = form.watch("color")
  const iconUrl = form.watch("iconUrl")

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
                <Input placeholder="Ex: Conta principal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => ACCOUNT_TYPE_LABELS[value as keyof typeof ACCOUNT_TYPE_LABELS]}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {defaultValues === undefined && (
          <FormField
            control={form.control}
            name="initialBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo inicial (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} value={field.value as number | string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
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
                <IconPicker
                  value={field.value}
                  color={color}
                  imageUrl={iconUrl}
                  folder="accounts"
                  onChange={field.onChange}
                  onImageChange={(url) => form.setValue("iconUrl", url)}
                />
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
