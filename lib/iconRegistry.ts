import * as LucideIcons from "lucide-react"
import type { LucideIcon } from "lucide-react"

/**
 * Icon names are exact Lucide component export names, stored as-is in
 * Firestore. We resolve against the full lucide-react namespace (thousands
 * of icons) rather than a small hand-picked map, so any icon a user finds
 * via search in IconPicker renders correctly everywhere (lists, forms,
 * dashboard) — not just inside the picker itself.
 */
const ALL_ICON_NAMES: string[] = Object.keys(LucideIcons)
  .filter((key) => /^[A-Z]/.test(key) && !key.endsWith("Icon"))
  .sort((a, b) => a.localeCompare(b))

export const DEFAULT_ICON_NAME = "Tag"

/** A curated starting set shown before the user types a search query. */
export const POPULAR_ICON_NAMES = [
  "Tag",
  "Wallet",
  "Landmark",
  "PiggyBank",
  "Banknote",
  "CreditCard",
  "Coins",
  "Gem",
  "Building",
  "Building2",
  "ShoppingCart",
  "ShoppingBag",
  "Utensils",
  "Coffee",
  "Pizza",
  "Car",
  "Bus",
  "Bike",
  "Fuel",
  "Plane",
  "Truck",
  "Home",
  "Wrench",
  "Zap",
  "Wifi",
  "Phone",
  "Smartphone",
  "Laptop",
  "HeartPulse",
  "Stethoscope",
  "Pill",
  "PartyPopper",
  "Gift",
  "Music",
  "Film",
  "Gamepad2",
  "BookOpen",
  "GraduationCap",
  "School",
  "Briefcase",
  "DollarSign",
  "Receipt",
  "Repeat",
  "Dumbbell",
  "Shirt",
  "Scissors",
  "Dog",
  "PawPrint",
  "Baby",
  "TreePine",
  "Umbrella",
].filter((name) => ALL_ICON_NAMES.includes(name))

export function getIconComponent(name: string | undefined | null): LucideIcon {
  const icon = name ? (LucideIcons as unknown as Record<string, LucideIcon>)[name] : undefined
  return icon ?? (LucideIcons as unknown as Record<string, LucideIcon>)[DEFAULT_ICON_NAME]
}

/** Empty query returns the curated popular set; otherwise searches all ~4000 icon names. */
export function searchIconNames(query: string, limit = 60): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return POPULAR_ICON_NAMES
  return ALL_ICON_NAMES.filter((name) => name.toLowerCase().includes(q)).slice(0, limit)
}
