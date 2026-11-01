import * as React from "react"

import { cn } from "@/lib/utils"

// Same size scale as Input/SelectTrigger (--control-h): 44px + 16px text on
// touch screens (prevents iOS zoom on focus), 40px + 14px text from `sm` up.
const nativeSelectClassName =
  "border-input dark:bg-input/30 flex h-(--control-h) w-full min-w-0 cursor-pointer rounded-md border bg-transparent px-3 py-1 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(nativeSelectClassName, className)}
      {...props}
    />
  )
}

export { NativeSelect, nativeSelectClassName }
