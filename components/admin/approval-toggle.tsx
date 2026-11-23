"use client";

import { useActionState, useEffect } from "react";
import { toggleStudentApproval } from "@/app/actions/approval";
import { Loader2 } from "lucide-react";

export function ApprovalToggle({
  userId,
  isApproved,
  disabled,
}: {
  userId: string;
  isApproved: boolean;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(toggleStudentApproval, undefined);

  useEffect(() => {
    if (state?.success) {
      alert(state.success);
    }
    if (state?.error) {
      alert(state.error);
    }
  }, [state]);

  return (
    <form action={action} className="flex items-center space-x-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isApproved" value={(!isApproved).toString()} />
      <button 
        type="submit" 
        disabled={disabled || pending}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isApproved ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className="sr-only">Toggle approval</span>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
        ) : (
          <span 
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-primary-foreground shadow ring-0 transition duration-200 ease-in-out ${isApproved ? 'translate-x-4' : 'translate-x-0'}`} 
          />
        )}
      </button>
    </form>
  );
}
