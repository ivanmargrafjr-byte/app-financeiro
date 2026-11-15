"use client"

import { useSyncExternalStore } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

const subscribeNothing = () => () => {}

/**
 * The theme is only known in the browser, so nothing is marked as chosen until after
 * hydration — otherwise the server would render one option selected and the client another.
 */
export function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>
          Escolha o tema do app. &ldquo;Sistema&rdquo; segue o modo claro ou escuro do seu aparelho.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div role="radiogroup" aria-label="Tema do app" className="flex flex-wrap gap-2">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = mounted && theme === value
            return (
              <Button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                variant={selected ? "default" : "outline"}
                className="h-11"
                onClick={() => setTheme(value)}
              >
                <Icon className="size-4" />
                {label}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
