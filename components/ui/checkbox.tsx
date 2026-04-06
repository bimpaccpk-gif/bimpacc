"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "checked" | "onChange"> {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled = false, ...props }, ref) => {
    const isChecked = checked === true;

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        role="checkbox"
        aria-checked={isChecked}
        className={cn(
          "inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-primary shadow transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-primary text-primary-foreground" : "bg-transparent",
          className
        )}
        onPointerDown={(e) => {
          e.preventDefault();
          onCheckedChange?.(!isChecked);
        }}
        {...props}
      >
        {isChecked && <Check className="h-3 w-3" />}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
