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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { todayDateString } from "@/lib/domain/dateUtils"
import { normalizeAccessKey } from "@/lib/domain/fiscalNote"
import {
  fiscalNoteSchema,
  type FiscalNoteFormInput,
  type FiscalNoteFormValues,
} from "@/lib/validators/fiscalNote"

type ExtractedFiscalNote = {
  kind: "produto" | "servico" | "outra" | null
  number: string | null
  series: string | null
  accessKey: string | null
  issuer: string | null
  issuerDocument: string | null
  recipient: string | null
  recipientDocument: string | null
  description: string | null
  issueDate: string | null
  dueDate: string | null
  value: number | null
  taxes: number | null
}

export const KIND_LABELS: Record<string, string> = {
  servico: "Serviço (NFS-e)",
  produto: "Produto (NF-e)",
  outra: "Outra",
}

export function FiscalNoteForm({
  defaultValues,
  currentFileName,
  submitLabel,
  submitting,
  onSubmit,
}: {
  defaultValues?: Partial<FiscalNoteFormInput>
  /** Name of the file already attached, shown when editing and no new file was chosen. */
  currentFileName?: string | null
  submitLabel: string
  submitting: boolean
  onSubmit: (values: FiscalNoteFormValues) => void
}) {
  const [extracting, setExtracting] = useState(false)

  const form = useForm<FiscalNoteFormInput, unknown, FiscalNoteFormValues>({
    resolver: zodResolver(fiscalNoteSchema),
    defaultValues: {
      kind: "servico",
      number: "",
      series: "",
      accessKey: "",
      issuer: "",
      issuerDocument: "",
      recipient: "",
      recipientDocument: "",
      description: "",
      issueDate: todayDateString(),
      notes: "",
      ...defaultValues,
    },
  })

  const file = form.watch("file")

  async function handleFileChange(selected: File | undefined) {
    form.setValue("file", selected)
    if (!selected) return

    setExtracting(true)
    try {
      const body = new FormData()
      body.append("file", selected)
      const res = await fetch("/api/fiscal-notes/extract", { method: "POST", body })
      if (!res.ok) throw new Error("extraction failed")

      const data: ExtractedFiscalNote = await res.json()
      if (data.kind) form.setValue("kind", data.kind)
      if (data.number) form.setValue("number", data.number)
      if (data.series) form.setValue("series", data.series)
      const accessKey = normalizeAccessKey(data.accessKey)
      if (accessKey) form.setValue("accessKey", accessKey)
      if (data.issuer) form.setValue("issuer", data.issuer)
      if (data.issuerDocument) form.setValue("issuerDocument", data.issuerDocument)
      if (data.recipient) form.setValue("recipient", data.recipient)
      if (data.recipientDocument) form.setValue("recipientDocument", data.recipientDocument)
      if (data.description) form.setValue("description", data.description)
      if (data.issueDate) form.setValue("issueDate", data.issueDate)
      if (data.dueDate) form.setValue("dueDate", data.dueDate)
      if (data.value != null) form.setValue("value", data.value)
      if (data.taxes != null) form.setValue("taxes", data.taxes)
      toast.success("Dados extraídos da nota — revise antes de salvar")
    } catch {
      toast.error("Não foi possível ler a nota automaticamente. Preencha os campos manualmente.")
    } finally {
      setExtracting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
        <FormField
          control={form.control}
          name="file"
          // value is pulled out only so it isn't spread onto the (uncontrollable) native file input
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel>Arquivo da nota (PDF ou foto)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  {...rest}
                />
              </FormControl>
              {extracting && (
                <p className="text-muted-foreground text-xs">
                  Lendo a nota e preenchendo os campos...
                </p>
              )}
              {currentFileName && !file && !extracting && (
                <p className="text-muted-foreground text-xs">Arquivo atual: {currentFileName}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(value: string) => KIND_LABELS[value] ?? value}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(KIND_LABELS).map(([value, label]) => (
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
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="issuer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emitente</FormLabel>
                <FormControl>
                  <Input placeholder="Quem emitiu a nota" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="issuerDocument"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ/CPF do emitente</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destinatário / tomador</FormLabel>
                <FormControl>
                  <Input placeholder="Quem pagou" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recipientDocument"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CNPJ/CPF do destinatário</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="O que foi comprado ou contratado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de emissão</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vencimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor total (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={(field.value as number | string | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taxes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Impostos (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    value={(field.value as number | string | undefined) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="series"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Série</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accessKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chave de acesso</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="44 dígitos (NF-e)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Opcional" {...field} />
              </FormControl>
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
