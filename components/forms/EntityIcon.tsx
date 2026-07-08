import { getIconComponent } from "@/lib/iconRegistry"
import { cn } from "@/lib/utils"

export function EntityIcon({
  name,
  color,
  className,
}: {
  name: string | undefined | null
  color: string
  className?: string
}) {
  const Icon = getIconComponent(name)
  return <Icon className={cn("size-4 shrink-0", className)} style={{ color }} />
}
