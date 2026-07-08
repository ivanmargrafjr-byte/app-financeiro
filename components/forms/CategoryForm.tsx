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
import type { Category } from "@/lib/types"
import { categorySchema, type CategoryFormValues } from "@/lib/validators/category"

const NO_PARENT = "none"

export function CategoryForm({
  categories,
  editingId,
  defaultValues,
  submitLabel,
  submitting,
  onSubmit,
}: {
  /** All categories, used to populate the "categoria pai" selector. */
  categories: Category[]
  /** When editing, excludes this category (and any of its own subcategories) from the parent options. */
  editingId?: string
  defaultValues?: Partial<CategoryFormValues>
  submitLabel: string
  submitting: boolean
  onSubmit: (values: CategoryFormValues) => void
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "despesa",
      icon: DEFAULT_ICON_NAME,
      color: COLOR_PALETTE[0],
      parentId: null,
      ...defaultValues,
    },
  })

  const type = form.watch("type")
  const color = form.watch("color")
  const parentOptions = categories.filter(
    (c) => c.type === type && c.parentId === null && c.id !== editingId
  )

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
                <Input placeholder="Ex: Farmácia" {...field} />
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
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  form.setValue("parentId", null)
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => (value === "receita" ? "Receita" : "Despesa")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria pai (opcional)</FormLabel>
              <Select
                value={field.value ?? NO_PARENT}
                onValueChange={(value) => field.onChange(value === NO_PARENT ? null : value)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        value === NO_PARENT
                          ? "Nenhuma — categoria principal"
                          : parentOptions.find((c) => c.id === value)?.name
                      }
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Nenhuma — categoria principal</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
