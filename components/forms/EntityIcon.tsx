import { getIconComponent } from "@/lib/iconRegistry"
import { cn } from "@/lib/utils"

export function EntityIcon({
  name,
  color,
  imageUrl,
  className,
}: {
  name: string | undefined | null
  color: string
  /** Custom uploaded image URL; when set, renders instead of the Lucide icon. */
  imageUrl?: string | null
  className?: string
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary-size Storage URLs, no next/image optimization needed for small icons
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn("size-4 shrink-0 rounded-sm object-cover", className)}
      />
    )
  }
  const Icon = getIconComponent(name)
  return <Icon className={cn("size-4 shrink-0", className)} style={{ color }} />
}
