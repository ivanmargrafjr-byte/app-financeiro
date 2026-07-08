"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, MoreVertical } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ContractForm } from "@/components/forms/ContractForm"
import { formatCentsBRL, fromCents } from "@/lib/domain/money"
import {
  useArchiveContract,
  useContracts,
  useUpdateContract,
} from "@/lib/hooks/useContracts"
import type { ContractFormValues } from "@/lib/validators/contract"

function formatBrDate(date: string) {
  return date.split("-").reverse().join("/")
}

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>
}) {
  const { contractId } = use(params)
  const { data: contracts, isLoading } = useContracts()
  const updateContract = useUpdateContract()
  const archiveContract = useArchiveContract()
  const [editOpen, setEditOpen] = useState(false)

  const contract = contracts?.find((c) => c.id === contractId)

  async function handleUpdate(values: ContractFormValues) {
    if (!contract) return
    try {
      await updateContract.mutateAsync({
        id: contract.id,
        values,
        previousFileStoragePath: contract.fileStoragePath,
      })
      toast.success("Contrato atualizado")
      setEditOpen(false)
    } catch {
      toast.error("Não foi possível atualizar o contrato")
    }
  }

  async function handleArchive() {
    if (!contract) return
    try {
      await archiveContract.mutateAsync(contract.id)
      toast.success("Contrato arquivado")
    } catch {
      toast.error("Não foi possível arquivar o contrato")
    }
  }

  return (
    <div className="grid gap-4">
      <Link
        href="/contratos"
        className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        Contratos
      </Link>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      {!isLoading && !contract && (
        <p className="text-muted-foreground text-sm">Contrato não encontrado.</p>
      )}

      {contract && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Contrato {contract.number}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                  Arquivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar contrato</DialogTitle>
              </DialogHeader>
              <ContractForm
                defaultValues={{
                  number: contract.number,
                  contractor: contract.contractor,
                  contractee: contract.contractee,
                  scope: contract.scope,
                  startDate: contract.startDate,
                  endDate: contract.endDate,
                  executionDays: contract.executionDays ?? undefined,
                  paymentMethod: contract.paymentMethod,
                  value:
                    contract.valueCents !== null ? fromCents(contract.valueCents) : undefined,
                  notes: contract.notes ?? "",
                }}
                currentFileName={contract.fileName}
                submitLabel="Salvar alterações"
                submitting={updateContract.isPending}
                onSubmit={handleUpdate}
              />
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Contratante</p>
              <p className="text-sm font-medium">{contract.contractor}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Contratado</p>
              <p className="text-sm font-medium">{contract.contractee}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Vigência</p>
              <p className="text-sm font-medium">
                {formatBrDate(contract.startDate)} a {formatBrDate(contract.endDate)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Prazo de execução</p>
              <p className="text-sm font-medium">
                {contract.executionDays !== null ? `${contract.executionDays} dias` : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Forma de pagamento</p>
              <p className="text-sm font-medium">{contract.paymentMethod}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valor do contrato</p>
              <p className="text-sm font-medium">
                {contract.valueCents !== null ? formatCentsBRL(contract.valueCents) : "—"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">Escopo / objeto</p>
            <p className="text-sm whitespace-pre-wrap">{contract.scope}</p>
          </div>

          {contract.notes && (
            <div>
              <p className="text-muted-foreground text-xs">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
            </div>
          )}

          <div>
            <p className="text-muted-foreground text-xs">Arquivo</p>
            {contract.fileUrl ? (
              <a
                href={contract.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                <FileText className="size-4" />
                {contract.fileName}
              </a>
            ) : (
              <p className="text-sm">—</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
