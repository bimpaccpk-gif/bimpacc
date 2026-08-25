"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button-variants";

/**
 * Click event Base UI hands to dialog buttons — a React mouse event augmented
 * with `preventBaseUIHandler()`, which stops the built-in close behaviour.
 */
type ConfirmClickEvent = Parameters<
  NonNullable<React.ComponentProps<typeof AlertDialogAction>["onClick"]>
>[0];

interface ConfirmActionProps {
  /**
   * The element that opens the confirmation dialog, e.g.
   * `<Button variant="destructive" size="xs">Delete</Button>` — rendered
   * through Base UI's `render` prop so no nested-button markup is produced.
   */
  trigger: React.ReactElement;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styling on the confirm button (the default). */
  destructive?: boolean;
  /**
   * Runs once the user confirms. While the promise is in flight the dialog
   * stays open, both buttons are disabled and the confirm button shows a
   * spinner; duplicate clicks are ignored.
   */
  onConfirm: () => Promise<void> | void;
}

/**
 * App-standard replacement for `window.confirm`: an alert dialog whose confirm
 * action supports async work. Errors thrown by `onConfirm` are logged here and
 * the dialog stays open so the user can retry or cancel.
 */
function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
}: ConfirmActionProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const pendingRef = React.useRef(false);

  async function handleConfirm(event: ConfirmClickEvent) {
    // Keep the dialog open while onConfirm runs — we close it ourselves below.
    event.preventBaseUIHandler();

    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);

    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      console.error("[ConfirmAction] onConfirm failed:", error);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />

      <AlertDialogContent aria-busy={pending}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? undefined : buttonVariants()}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? <Loader2Icon aria-hidden="true" className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmAction };
