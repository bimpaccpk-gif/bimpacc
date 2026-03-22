"use client";

import { useState, useActionState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminDeleteUser } from "@/lib/supabase/actions";
import { Trash2, AlertCircle, Check, Loader2 } from "lucide-react";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
}

export function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(adminDeleteUser, undefined);

  if (state?.success) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-success">{state.success}</span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({ variant: "ghost", size: "icon-xs" })}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{userName}</strong>? This
            action cannot be undone. All their enrollments will also be removed.
          </DialogDescription>
        </DialogHeader>
        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <form action={action} className="mt-4 flex gap-3">
          <input type="hidden" name="userId" value={userId} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className={buttonVariants({ variant: "destructive" })}
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {pending ? "Deleting..." : "Delete User"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
