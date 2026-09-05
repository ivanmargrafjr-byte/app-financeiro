"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { useAuth } from "@/lib/auth/AuthProvider"
import { authErrorMessage } from "@/lib/firebase/authErrors"
import { passwordResetSchema, type PasswordResetFormValues } from "@/lib/validators/auth"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function RecuperarSenhaPage() {
  const { sendPasswordReset } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: PasswordResetFormValues) {
    setSubmitting(true)
    try {
      await sendPasswordReset(values.email)
      setSentTo(values.email)
    } catch (error) {
      // An address with no account gets the same confirmation as one that has: saying
      // "this e-mail doesn't exist" would let anyone check who has an account here.
      // (Firebase's own enumeration protection may already answer this way; handling
      // the code keeps the screen honest either way.)
      if ((error as { code?: string })?.code === "auth/user-not-found") {
        setSentTo(values.email)
      } else {
        toast.error(authErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Image
            src="/logo-mark.png"
            alt="Finanças"
            width={56}
            height={56}
            priority
            className="mb-2"
          />
          <CardTitle>{sentTo ? "Verifique seu e-mail" : "Recuperar senha"}</CardTitle>
          <CardDescription>
            {sentTo
              ? `Se existir uma conta com ${sentTo}, o link para criar uma nova senha chega em instantes.`
              : "Informe seu e-mail e enviamos um link para você criar uma nova senha."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentTo ? (
            <div className="grid grid-cols-1 gap-4">
              <p className="text-muted-foreground text-sm">
                O link vale por um tempo limitado. Não esqueça de olhar a caixa de spam — o
                e-mail é enviado pelo Firebase, em nome do Finanças.
              </p>
              <Button nativeButton={false} render={<Link href="/login" />}>
                Voltar para o login
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSentTo(null)
                  form.reset()
                }}
              >
                Usar outro e-mail
              </Button>
            </div>
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={submitting} className="mt-2">
                    {submitting ? "Enviando..." : "Enviar link"}
                  </Button>
                </form>
              </Form>
              <p className="text-muted-foreground mt-4 text-center text-sm">
                Lembrou a senha?{" "}
                <Link href="/login" className="text-foreground underline underline-offset-4">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
