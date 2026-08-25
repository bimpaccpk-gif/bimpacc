"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<
    CheckboxPrimitive.Root.Props,
    "checked" | "indeterminate" | "onCheckedChange" | "className"
  > {
  className?: string
  /**
   * Controlled checked state. Pass `"indeterminate"` for a mixed state.
   */
  checked?: boolean | "indeterminate"
  /**
   * Explicit mixed-state flag, alternative to `checked="indeterminate"`.
   */
  indeterminate?: boolean
  onCheckedChange?: (
    checked: boolean,
    eventDetails: CheckboxPrimitive.Root.ChangeEventDetails
  ) => void
}

/**
 * Checkbox built on Base UI's checkbox primitive.
 *
 * Renders an accessible `role="checkbox"` control with full keyboard support
 * (Space/Enter toggle) plus a visually-hidden native input used for forms and
 * `<label htmlFor>` association — the consumer-supplied `id` lands on that
 * input, not on the visual box.
 */
function Checkbox({
  className,
  checked,
  indeterminate,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const isIndeterminate = indeterminate ?? checked === "indeterminate"

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked === "indeterminate" ? false : checked}
      indeterminate={isIndeterminate}
      onCheckedChange={onCheckedChange}
      className={cn(
        "inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-input bg-background shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-[indeterminate]:border-primary data-[indeterminate]:bg-primary data-[indeterminate]:text-primary-foreground",
        className
      )}
      {...props}
    >
      {isIndeterminate ? (
        <MinusIcon className="pointer-events-none size-3 shrink-0 text-primary-foreground" />
      ) : (
        <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
          <CheckIcon className="size-3 shrink-0 text-primary-foreground" />
        </CheckboxPrimitive.Indicator>
      )}
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
