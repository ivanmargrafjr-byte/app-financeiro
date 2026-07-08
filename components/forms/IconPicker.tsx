"use client"

import { useState } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { getIconComponent, searchIconNames } from "@/lib/iconRegistry"
import { cn } from "@/lib/utils"

export function IconPicker({
  value,
  color,
  onChange,
}: {
  value: string
  color: string
  onChange: (icon: string) => void
}) {
  const [query, setQuery] = useState("")
  const names = searchIconNames(query)

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar entre milhares de ícones..."
          className="pl-8"
        />
      </div>
      <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto rounded-md border p-2">
        {names.length === 0 && (
          <p className="text-muted-foreground col-span-8 py-4 text-center text-sm">
            Nenhum ícone encontrado.
          </p>
        )}
        {names.map((name) => {
          const Icon = getIconComponent(name)
          const selected = value === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              aria-label={`Selecionar ícone ${name}`}
              title={name}
              className={cn(
                "flex size-8 items-center justify-center rounded-md transition-colors",
                selected ? "bg-accent ring-1 ring-ring" : "hover:bg-accent"
              )}
            >
              <Icon className="size-4" style={{ color: selected ? color : undefined }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
