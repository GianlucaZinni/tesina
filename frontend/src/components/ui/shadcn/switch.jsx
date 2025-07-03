import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef(({ className, icon, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "relative peer inline-flex h-10 w-20 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none absolute left-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-200",
        "data-[state=checked]:translate-x-9"
      )}
    >
      {icon}
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
))
Switch.displayName = "Switch"

export { Switch }