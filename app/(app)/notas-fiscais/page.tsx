"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Receipt } from "lucide-react"
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
import { FiscalNoteForm, KIND_LABELS } from "@/components/forms/FiscalNoteForm"
import { formatCentsBRL } from "@/lib/domain/money"
import { useCreateFiscalNote, useFiscalNotes } from "@/lib/hooks/useFiscalNotes"
import type { FiscalNoteFormValues } from "@/lib/validators/fiscalNote"

function formatBrDate(date: string) {
  return date.split("-").reverse().join("/")
}

export default function NotasFiscaisPage() {
  const { data: notes, isLoading } = useFiscalNotes()
  const createNote = useCreateFiscalNote()
  const [open, setOpen] = useState(false)

  async function handleCreate(values: FiscalNoteFormValues) {
    try {
      await createNote.mutateAsync(values)
      toast.success("Nota fiscal cadastrada")
      setOpen(false)
    } catch {
      toast.error("Não foi possível cadastrar a nota fiscal")
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Notas fiscais</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nova nota fiscal
          </Button>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova nota fiscal</DialogTitle>
            </DialogHeader>
            <FiscalNoteForm
              submitLabel="Cadastrar nota"
              submitting={createNote.isPending}
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

      {!isLoading && notes?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma nota fiscal cadastrada ainda. Envie o PDF ou uma foto da primeira e o app lê os dados para você.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes?.map((note) => (
          <Link key={note.id} href={`/notas-fiscais/${note.id}`}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Receipt className="size-4 shrink-0" />
                  Nota {note.number}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-1">
                <p className="text-sm">{note.issuer}</p>
                <p className="text-muted-foreground line-clamp-2 text-sm">{note.description}</p>
                <p className="text-muted-foreground text-xs">
                  {KIND_LABELS[note.kind]} · emitida em {formatBrDate(note.issueDate)}
                  {note.dueDate && ` · vence em ${formatBrDate(note.dueDate)}`}
                </p>
                <p className="text-sm font-medium">{formatCentsBRL(note.valueCents)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
