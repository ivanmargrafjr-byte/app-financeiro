"use client"

import { useRef, useState } from "react"
import { Search, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth/AuthProvider"
import { getIconComponent, searchIconNames } from "@/lib/iconRegistry"
import { type IconFolder, uploadEntityIcon } from "@/lib/firebase/uploadIcon"
import { cn } from "@/lib/utils"

export function IconPicker({
  value,
  color,
  imageUrl,
  folder,
  onChange,
  onImageChange,
}: {
  value: string
  color: string
  /** Custom uploaded image URL, if one is set; takes visual precedence over the Lucide icon. */
  imageUrl?: string
  /** Storage subfolder this entity's uploaded icons live under. */
  folder: IconFolder
  onChange: (icon: string) => void
  onImageChange: (imageUrl: string | undefined) => void
}) {
  const { user } = useAuth()
  const [query, setQuery] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const names = searchIconNames(query)

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !user) return
    setUploading(true)
    try {
      const url = await uploadEntityIcon(user.uid, folder, file)
      onImageChange(url)
    } catch {
      toast.error("Não foi possível enviar a imagem")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <div className="border-border flex size-10 items-center justify-center overflow-hidden rounded-md border">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small preview of an arbitrary Storage URL
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            (() => {
              const Icon = getIconComponent(value)
              return <Icon className="size-5" style={{ color }} />
            })()
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          {uploading ? "Enviando..." : "Enviar imagem"}
        </Button>
        {imageUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onImageChange(undefined)}>
            <X className="size-4" />
            Remover
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ou busque entre milhares de ícones..."
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
          const selected = !imageUrl && value === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name)
                onImageChange(undefined)
              }}
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
