"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

// Renders no element of its own, so it carries no data-slot.
function TooltipProvider({ ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider {...props} />
}

// Provider is optional in Base UI (it only shares hover delays across
// tooltips), so each Tooltip renders its own unless the app opts into a
// shared one by wrapping it with <TooltipProvider>.
function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({ className, ...props }: TooltipPrimitive.Trigger.Props) {
  return (
    // The wrapper span re-uses the global context-menu whitelist slot
    // (see app/layout.tsx) so right-click stays enabled on the trigger.
    <span data-slot="dropdown-menu-trigger" className="contents">
      <TooltipPrimitive.Trigger
        data-slot="tooltip-trigger"
        className={className}
        {...props}
      />
    </span>
  )
}

function TooltipContent({
  align = "center",
  alignOffset = 0,
  side = "top",
  sideOffset = 4,
  className,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      {/* The positioner carries the whitelist slot so right-click and copy
          keep working inside the portaled content (see app/layout.tsx). */}
      <TooltipPrimitive.Positioner
        data-slot="dropdown-menu-content"
        className="z-50"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 w-fit origin-(--transform-origin) rounded-md bg-foreground px-2.5 py-1 text-xs text-background select-none duration-150 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
