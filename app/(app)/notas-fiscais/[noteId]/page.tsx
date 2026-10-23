"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { FiscalNoteForm, KIND_LABELS } from "@/components/forms/FiscalNoteForm"
import { formatAccessKey } from "@/lib/domain/fiscalNote"
import { formatCentsBRL, fromCents } from "@/lib/domain/money"
import {
  useArchiveFiscalNote,
  useFiscalNotes,
  useUpdateFiscalNote,
} from "@/lib/hooks/useFiscalNotes"
import type { FiscalNoteFormValues } from "@/lib/validators/fiscalNote"

function formatBrDate(date: string) {
  return date.split("-").reverse().join("/")
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

export default function FiscalNoteDetailPage({
  params,
}: {
  params: Promise<{ noteId: string }>
}) {
  const { noteId } = use(params)
  const router = useRouter()
  const { data: notes, isLoading } = useFiscalNotes()
  const updateNote = useUpdateFiscalNote()
  const archiveNote = useArchiveFiscalNote()
  const [editOpen, setEditOpen] = useState(false)

  const note = notes?.find((n) => n.id === noteId)

  async function handleUpdate(values: FiscalNoteFormValues) {
    if (!note) return
    try {
      await updateNote.mutateAsync({
        id: note.id,
        values,
        previousFileStoragePath: note.fileStoragePath,
      })
      toast.success("Nota fiscal atualizada")
      setEditOpen(false)
    } catch {
      toast.error("Não foi possível atualizar a nota fiscal")
    }
  }

  async function handleArchive() {
    if (!note) return
    try {
      await archiveNote.mutateAsync(note.id)
      toast.success("Nota fiscal arquivada")
      router.replace("/notas-fiscais")
    } catch {
      toast.error("Não foi possível arquivar a nota fiscal")
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <Link
        href="/notas-fiscais"
        className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeft className="size-4" />
        Notas fiscais
      </Link>

      {isLoading && <p className="text-muted-foreground text-sm">Carregando...</p>}

      {!isLoading && !note && (
        <p className="text-muted-foreground text-sm">Nota fiscal não encontrada.</p>
      )}

      {note && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold">Nota {note.number}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>Editar</DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>Arquivar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar nota fiscal</DialogTitle>
              </DialogHeader>
              <FiscalNoteForm
                defaultValues={{
                  kind: note.kind,
                  number: note.number,
                  series: note.series ?? "",
                  accessKey: note.accessKey ?? "",
                  issuer: note.issuer,
                  issuerDocument: note.issuerDocument ?? "",
                  recipient: note.recipient ?? "",
                  recipientDocument: note.recipientDocument ?? "",
                  description: note.description,
                  issueDate: note.issueDate,
                  dueDate: note.dueDate ?? undefined,
                  value: fromCents(note.valueCents),
                  taxes: note.taxCents != null ? fromCents(note.taxCents) : undefined,
                  notes: note.notes ?? "",
                }}
                currentFileName={note.fileName}
                submitLabel="Salvar alterações"
                submitting={updateNote.isPending}
                onSubmit={handleUpdate}
              />
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">{KIND_LABELS[note.kind]}</Field>
            <Field label="Valor total">{formatCentsBRL(note.valueCents)}</Field>
            <Field label="Emitente">
              {note.issuer}
              {note.issuerDocument && ` · ${note.issuerDocument}`}
            </Field>
            <Field label="Destinatário / tomador">
              {note.recipient ? (
                <>
                  {note.recipient}
                  {note.recipientDocument && ` · ${note.recipientDocument}`}
                </>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Emissão">{formatBrDate(note.issueDate)}</Field>
            <Field label="Vencimento">{note.dueDate ? formatBrDate(note.dueDate) : "—"}</Field>
            <Field label="Impostos">
              {note.taxCents !== null ? formatCentsBRL(note.taxCents) : "—"}
            </Field>
            <Field label="Série">{note.series ?? "—"}</Field>
          </div>

          {note.accessKey && (
            <div>
              <p className="text-muted-foreground text-xs">Chave de acesso</p>
              <p className="font-mono text-sm break-all">{formatAccessKey(note.accessKey)}</p>
            </div>
          )}

          <div>
            <p className="text-muted-foreground text-xs">Descrição</p>
            <p className="text-sm whitespace-pre-wrap">{note.description}</p>
          </div>

          {note.notes && (
            <div>
              <p className="text-muted-foreground text-xs">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
            </div>
          )}

          <div>
            <p className="text-muted-foreground text-xs">Arquivo</p>
            {note.fileUrl ? (
              <a
                href={note.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                <FileText className="size-4" />
                {note.fileName}
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
