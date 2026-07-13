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
import { formatCentsBRL } from "@/lib/domain/money"
import { todayDateString } from "@/lib/domain/dateUtils"
import {
  balanceAdjustmentSchema,
  type BalanceAdjustmentFormInput,
  type BalanceAdjustmentFormValues,
} from "@/lib/validators/balanceAdjustment"

export function AdjustBalanceForm({
  currentBalanceCents,
  submitLabel,
  submitting,
  onSubmit,
}: {
  currentBalanceCents: number
  submitLabel: string
  submitting: boolean
  onSubmit: (values: BalanceAdjustmentFormValues) => void
}) {
  const form = useForm<BalanceAdjustmentFormInput, unknown, BalanceAdjustmentFormValues>({
    resolver: zodResolver(balanceAdjustmentSchema),
    defaultValues: {
      newBalance: currentBalanceCents / 100,
      date: todayDateString(),
      description: "",
    },
  })

  const newBalance = form.watch("newBalance")
  const deltaCents = Math.round(Number(newBalance) * 100) - currentBalanceCents

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          Saldo atual: <span className="text-foreground font-medium">{formatCentsBRL(currentBalanceCents)}</span>
        </p>
        <FormField
          control={form.control}
          name="newBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Novo saldo (R$)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} value={field.value as number | string} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {deltaCents !== 0 && (
          <p className="text-muted-foreground text-xs">
            Isso vai lançar um ajuste de{" "}
            <span
              className={deltaCents > 0 ? "text-emerald-600 font-medium" : "text-foreground font-medium"}
            >
              {deltaCents > 0 ? "+" : "-"}
              {formatCentsBRL(Math.abs(deltaCents))}
            </span>{" "}
            nessa conta.
          </p>
        )}
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Conferência com o extrato do banco" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting || deltaCents === 0} className="mt-2">
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </form>
    </Form>
  )
}
