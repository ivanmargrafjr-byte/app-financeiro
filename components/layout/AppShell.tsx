"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CreditCard,
  FileText,
  LayoutDashboard,
  ListTree,
  LogOut,
  Repeat,
  Tag,
  Wallet,
} from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useMonth } from "@/lib/month/MonthProvider"
import { useEnsureRecurringGenerated } from "@/lib/hooks/useRecurringRules"
import { Button } from "@/components/ui/button"
import { MonthSwitcher } from "@/components/layout/MonthSwitcher"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumo", icon: LayoutDashboard },
  { href: "/contas", label: "Contas", icon: Wallet },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/transacoes", label: "Transações", icon: ListTree },
  { href: "/recorrentes", label: "Recorrências", icon: Repeat },
  { href: "/categorias", label: "Categorias", icon: Tag },
  { href: "/contratos", label: "Contratos", icon: FileText },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { month } = useMonth()
  useEnsureRecurringGenerated(month)

  async function handleSignOut() {
    await signOut()
    router.replace("/login")
  }

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="border-border flex shrink-0 flex-col border-b p-4 md:w-56 md:border-b-0 md:border-r">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold">
          <Image src="/logo-mark.png" alt="" width={28} height={28} priority />
          Finanças
        </div>
        <nav className="flex flex-1 flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-6 hidden flex-col gap-2 md:flex">
          <p className="text-muted-foreground truncate px-2 text-xs">{user?.email}</p>
          <Button variant="ghost" size="sm" className="justify-start" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-border flex items-center justify-between border-b p-4">
          <MonthSwitcher />
          <Button variant="ghost" size="sm" className="md:hidden" onClick={handleSignOut}>
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  )
}
