import Image from "next/image"
import Link from "next/link"
import { CreditCard, PieChart, Repeat, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Only the Brazilian storefronts are live — a /us/ App Store link 404s. */
const APP_STORE_URL = "https://apps.apple.com/br/app/finnancialapp/id6794407181"
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=br.tec.margraf.financas"

const FEATURES = [
  {
    icon: CreditCard,
    title: "Cartões e faturas",
    description:
      "Compras parceladas caem sozinhas nas faturas certas, mês a mês. Importe a fatura e o app lê os lançamentos para você.",
  },
  {
    icon: Repeat,
    title: "Contas que se repetem",
    description:
      "Assinaturas, aluguel, mensalidades: cadastre uma vez e elas aparecem todo mês, sem você lembrar.",
  },
  {
    icon: PieChart,
    title: "Para onde foi o dinheiro",
    description:
      "Cada gasto entra numa categoria, e o resumo do mês mostra onde ele foi parar — sem planilha.",
  },
  {
    icon: Wallet,
    title: "Saldo que se antecipa",
    description:
      "Some o que você tem, menos o que ainda vai sair e as faturas em aberto. O saldo real do fim do mês.",
  },
]

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 text-lg font-semibold">
          <Image src="/logo-mark.png" alt="" width={28} height={28} priority />
          Finanças
        </span>
        <Link href="/login" className="text-muted-foreground text-sm hover:underline">
          Entrar
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <section className="grid gap-6 py-10 sm:py-16">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Fim da surpresa no fim do mês.
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg">
            Contas, cartões e assinaturas organizados num só lugar — para você saber
            quanto sobra antes de a fatura chegar.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* These navigate rather than act, so they render as links — nativeButton
                must say so, or Base UI warns about the lost button semantics. */}
            <Button
              nativeButton={false}
              render={<a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" />}
            >
              Baixar na App Store
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" />}
            >
              Baixar no Google Play
            </Button>
            <Button variant="ghost" nativeButton={false} render={<Link href="/signup" />}>
              Ou use pelo navegador
            </Button>
          </div>

          {/* "sem cartão" is the whole point of the change and the strongest thing
              this line can say — it is also now literally true. */}
          <p className="text-muted-foreground text-sm">
            7 dias grátis, sem cartão · depois R$ 19,90/mês · cancele quando quiser
          </p>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="border-border grid gap-2 rounded-lg border p-5">
              <Icon className="text-muted-foreground size-5" />
              <h2 className="font-medium">{title}</h2>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-border mx-auto w-full max-w-5xl border-t px-6 py-6">
        <p className="text-muted-foreground text-center text-xs">
          <Link href="/termos" className="underline">
            Termos de Uso
          </Link>
          {" · "}
          <Link href="/privacidade" className="underline">
            Política de Privacidade
          </Link>
        </p>
      </footer>
    </div>
  )
}
