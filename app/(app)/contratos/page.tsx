"use client"

import { useState } from "react"
import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ContractForm } from "@/components/forms/ContractForm"
import { formatCentsBRL } from "@/lib/domain/money"
import { useContracts, useCreateContract } from "@/lib/hooks/useContracts"
import type { ContractFormValues } from "@/lib/validators/contract"

function formatBrDate(date: string) {
  return date.split("-").reverse().join("/")
}

export default function ContratosPage() {
  const { data: contracts, isLoading } = useContracts()
  const createContract = useCreateContract()
  const [open, setOpen] = useState(false)

  async function handleCreate(values: ContractFormValues) {
    if (!values.file) {
      toast.error("Anexe o arquivo do contrato")
      return
    }
    try {
      await createContract.mutateAsync(values)
      toast.success("Contrato cadastrado")
      setOpen(false)
    } catch {
      toast.error("Não foi possível cadastrar o contrato")
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Contratos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Novo contrato
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo contrato</DialogTitle>
            </DialogHeader>
            <ContractForm
              submitLabel="Cadastrar contrato"
              submitting={createContract.isPending}
              onSubmit={handleCreate}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {!isLoading && contracts?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum contrato cadastrado ainda. Cadastre o primeiro para começar a acompanhar vigências e pagamentos.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contracts?.map((contract) => (
          <Link key={contract.id} href={`/contratos/${contract.id}`}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <FileText className="size-4 shrink-0" />
                  {contract.number}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1">
                <p className="text-sm">
                  {contract.contractor} → {contract.contractee}
                </p>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {contract.scope}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatBrDate(contract.startDate)} a {formatBrDate(contract.endDate)}
                </p>
                {contract.valueCents !== null && (
                  <p className="text-sm font-medium">
                    {formatCentsBRL(contract.valueCents)}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
