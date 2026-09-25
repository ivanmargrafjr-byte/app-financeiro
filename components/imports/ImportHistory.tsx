"use client"

import { Undo2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { formatDateBR } from "@/lib/domain/dateUtils"
import { dateStringFromMillis } from "@/lib/domain/dateUtils"
import type { ImportBatch } from "@/lib/hooks/useImports"

/**
 * The imports that can still be taken back.
 *
 * An import writes dozens of entries at once, which is exactly the operation someone
 * regrets: wrong account, wrong file, wrong month. Undoing it by hand means deleting
 * them one by one and hoping the balance lands where it started.
 */
export function ImportHistory({
  imports,
  accountNameById,
  onUndo,
  undoing,
}: {
  imports: ImportBatch[]
  accountNameById: Map<string, string>
  onUndo: (batch: ImportBatch) => void
  undoing?: boolean
}) {
  if (imports.length === 0) return null

  return (
    <ul className="grid gap-2">
      {imports.map((batch) => {
        const created = batch.createdIds.length
        const settled = batch.settledIds.length
        return (
          <li
            key={batch.id}
            className="border-border bg-card flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {batch.fileName ?? "Extrato importado"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {formatDateBR(dateStringFromMillis(batch.createdAt))} ·{" "}
                {accountNameById.get(batch.accountId) ?? "conta"} · {created}{" "}
                {created === 1 ? "criado" : "criados"}
                {settled > 0 && `, ${settled} efetivado${settled === 1 ? "" : "s"}`}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="ghost" size="sm" disabled={undoing} />}
              >
                <Undo2 className="size-4" />
                Desfazer
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desfazer esta importação?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {created > 0 && `Os ${created} lançamentos criados por ela serão excluídos. `}
                    {settled > 0 &&
                      `Os ${settled} que ela efetivou voltam a ficar pendentes. `}
                    O saldo da conta é corrigido pelo que for desfeito. Lançamentos que você
                    editou ou apagou depois não são tocados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onUndo(batch)}>Desfazer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        )
      })}
    </ul>
  )
}
