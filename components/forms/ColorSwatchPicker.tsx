"use client"

import { Check } from "lucide-react"
import { COLOR_PALETTE } from "@/lib/colorPalette"

export function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background focus-visible:outline-none"
          style={{ backgroundColor: color, boxShadow: value === color ? `0 0 0 2px ${color}` : undefined }}
          aria-label={`Selecionar cor ${color}`}
        >
          {value === color && <Check className="size-4 text-white" />}
        </button>
      ))}
    </div>
  )
}
