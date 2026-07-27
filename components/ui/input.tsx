import * as React from "react"

import { cn } from "@/lib/utils"

// A plain native <input>, deliberately not routed through @base-ui/react's Input
// primitive: that component only reports edits via a custom `onValueChange(value)`
// callback rather than a standard change event, which silently breaks any consumer
// (react-hook-form's field spread included) that passes a normal `onChange` — most
// visibly, deleting text never reached form state. A native input has none of that
// surface area to get wrong.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        type={type}
        data-slot="input"
        ref={ref}
        className={cn(
          "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
    )
  }
)

export { Input }
