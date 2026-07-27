import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, onChange, ...props }: React.ComponentProps<"input">) {
  // Base UI's Input primitive reports edits through `onValueChange(value)`, not a
  // standard change event — a plain `onChange` prop (e.g. from react-hook-form's
  // field spread) never fires through it, so typed edits (especially deletions,
  // which pass through an intermediate "" value) silently fail to reach form state.
  // File inputs are the exception: their meaningful payload is `.files`, not a
  // string value, so they keep using the native onChange event untouched.
  const isFile = type === "file"

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      onChange={isFile ? onChange : undefined}
      onValueChange={
        !isFile && onChange
          ? (value: string) =>
              onChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
          : undefined
      }
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
