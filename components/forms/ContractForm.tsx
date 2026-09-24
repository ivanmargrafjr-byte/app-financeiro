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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { todayDateString } from "@/lib/domain/dateUtils"
import {
  contractSchema,
  type ContractFormInput,
  type ContractFormValues,
} from "@/lib/validators/contract"

type ExtractedContract = {
  number: string | null
  contractor: string | null
  contractee: string | null
  scope: string | null
  startDate: string | null
  endDate: string | null
  executionDays: number | null
  paymentMethod: string | null
  value: number | null
}

const PERIOD_LABELS: Record<string, string> = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  unico: "Pagamento único",
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
}

export function ContractForm({
  defaultValues,
  currentFileName,
  submitLabel,
  submitting,
  onSubmit,
}: {
  defaultValues?: Partial<ContractFormInput>
  /** Name of the file already attached, shown when editing and no new file was chosen. */
  currentFileName?: string | null
  submitLabel: string
  submitting: boolean
  onSubmit: (values: ContractFormValues) => void
}) {
  const [extracting, setExtracting] = useState(false)

  const form = useForm<ContractFormInput, unknown, ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      number: "",
      contractor: "",
      contractee: "",
      scope: "",
      startDate: todayDateString(),
      endDate: todayDateString(),
      paymentMethod: "",
      notes: "",
      billingPeriod: "mensal",
      autoRenew: false,
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
      const res = await fetch("/api/contracts/extract", { method: "POST", body })
      if (!res.ok) throw new Error("extraction failed")

      const data: ExtractedContract = await res.json()
      if (data.number) form.setValue("number", data.number)
      if (data.contractor) form.setValue("contractor", data.contractor)
      if (data.contractee) form.setValue("contractee", data.contractee)
      if (data.scope) form.setValue("scope", data.scope)
      if (data.startDate) form.setValue("startDate", data.startDate)
      if (data.endDate) form.setValue("endDate", data.endDate)
      if (data.executionDays != null) form.setValue("executionDays", data.executionDays)
      if (data.paymentMethod) form.setValue("paymentMethod", data.paymentMethod)
      if (data.value != null) form.setValue("value", data.value)
      toast.success("Dados extraídos do PDF — revise antes de salvar")
    } catch {
      toast.error("Não foi possível ler o PDF automaticamente. Preencha os campos manualmente.")
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
              <FormLabel>Arquivo do contrato (PDF)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  {...rest}
                />
              </FormControl>
              {extracting && (
                <p className="text-muted-foreground text-xs">
                  Lendo o PDF e preenchendo os campos...
                </p>
              )}
              {currentFileName && !file && !extracting && (
                <p className="text-muted-foreground text-xs">
                  Arquivo atual: {currentFileName}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do contrato</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 001/2026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contractor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contratante</FormLabel>
                <FormControl>
                  <Input placeholder="Quem contrata" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contractee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contratado</FormLabel>
                <FormControl>
                  <Input placeholder="Quem presta o serviço" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Escopo / objeto</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva o objeto do contrato" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Início da vigência</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fim da vigência</FormLabel>
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
            name="executionDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prazo de execução (dias)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    {...field}
                    value={field.value as number | string | undefined ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do contrato (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value as number | string | undefined ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de pagamento</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Mensal, até o dia 10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <div className="border-border mt-2 grid gap-4 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">
            Ciclo de vida — o que o app precisa saber para avisar antes das datas que custam
            dinheiro. Tudo opcional.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="billingPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Periodicidade</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{(value: string) => PERIOD_LABELS[value] ?? value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PERIOD_LABELS).map(([value, label]) => (
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
              name="noticeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aviso de cancelamento (dias)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="30"
                      {...field}
                      value={(field.value as number | string | undefined) ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="autoRenew"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-2">
                <FormLabel className="font-normal">Renova automaticamente</FormLabel>
                <FormControl>
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="promoEndsAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fim do desconto</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={(field.value as string | undefined) ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postPromoValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor depois (R$)</FormLabel>
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
              name="adjustmentMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês do reajuste</FormLabel>
                  <Select
                    value={(field.value as string | undefined) ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: string) => MONTH_LABELS[value] ?? "Sem reajuste"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(MONTH_LABELS).map(([value, label]) => (
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
              name="adjustmentIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Índice</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="IPCA"
                      {...field}
                      value={(field.value as string | undefined) ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <Button type="submit" disabled={submitting || extracting} className="mt-2">
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </form>
    </Form>
  )
}
