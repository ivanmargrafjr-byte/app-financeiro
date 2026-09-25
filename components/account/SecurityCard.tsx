"use client"

import { useState, useSyncExternalStore } from "react"
import { Download, Eye, KeyRound } from "lucide-react"
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth/AuthProvider"
import { authErrorMessage } from "@/lib/firebase/authErrors"
import { exportFileName, exportUserData } from "@/lib/data/exportUserData"
import {
  getHiddenValues,
  getHiddenValuesOnServer,
  subscribeHiddenValues,
  toggleHiddenValues,
} from "@/lib/ui/hiddenValues"

/**
 * The controls that have to exist whatever someone pays: change the password, take
 * the data out, hide the figures on screen.
 *
 * None of it sits behind the subscription — the right to one's own data is not a
 * feature, and treating it as one is how an app ends up charging for a right.
 */
export function SecurityCard() {
  const { user } = useAuth()
  const [changing, setChanging] = useState(false)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  const hidden = useSyncExternalStore(
    subscribeHiddenValues,
    getHiddenValues,
    getHiddenValuesOnServer
  )

  async function changePassword() {
    if (!user?.email) return
    if (next.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres")
      return
    }
    setSaving(true)
    try {
      // Firebase demands a recent login before a password change, so the current one
      // is asked for here rather than sending the user back through the login screen.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current))
      await updatePassword(user, next)
      toast.success("Senha alterada. Os outros aparelhos vão precisar entrar de novo.")
      setChanging(false)
      setCurrent("")
      setNext("")
    } catch (error) {
      toast.error(authErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function exportData() {
    if (!user) return
    setExporting(true)
    try {
      const json = await exportUserData(user.uid)
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }))
      const link = document.createElement("a")
      link.href = url
      link.download = exportFileName()
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Arquivo gerado")
    } catch {
      toast.error("Não foi possível exportar agora")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segurança e seus dados</CardTitle>
        <CardDescription>
          Estes controles não dependem da assinatura.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <Eye className="text-muted-foreground size-4" />
            <span>
              Ocultar valores na tela
              <span className="text-muted-foreground block text-xs">
                Para abrir o app em lugar público. Fica só neste aparelho.
              </span>
            </span>
          </span>
          <Switch checked={hidden} onCheckedChange={() => toggleHiddenValues()} />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setChanging(true)}>
            <KeyRound className="size-4" />
            Trocar senha
          </Button>
          <Button variant="outline" onClick={exportData} disabled={exporting}>
            <Download className="size-4" />
            {exporting ? "Preparando..." : "Exportar meus dados"}
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          A exportação traz contas, cartões, lançamentos, faturas, recorrências, contratos,
          orçamentos e metas em um arquivo JSON. Trocar a senha encerra a sessão nos outros
          aparelhos.
        </p>
      </CardContent>

      <Dialog open={changing} onOpenChange={setChanging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <Input
                id="senha-atual"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="senha-nova">Nova senha</Label>
              <Input
                id="senha-nova"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <Button onClick={changePassword} disabled={saving}>
              {saving ? "Salvando..." : "Trocar senha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
