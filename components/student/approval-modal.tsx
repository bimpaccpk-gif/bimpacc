"use client";

import { useEffect } from "react";
import { Clock, ShieldAlert } from "lucide-react";

interface ApprovalModalProps {
  user: any;
}

export function ApprovalPendingModal({ user }: ApprovalModalProps) {
  // Block scrolling exactly like the onboarding modal
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-background rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border p-8 text-center space-y-6">
        
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 shadow-inner ring-1 ring-amber-500/20">
          <Clock className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Under Review</h2>
          <p className="text-muted-foreground/80 leading-relaxed text-sm w-4/5 mx-auto">
            Your profile has been secured and sent to the administration. You will unlock access to BIMPACC directly after an administrator verifies your documents and fee receipt.
          </p>
        </div>

        <div className="pt-4 border-t border-border mt-6 text-xs text-amber-600/80 dark:text-amber-500/80 flex items-center justify-center gap-2">
           <ShieldAlert className="h-4 w-4" />
           Your submitted documents are permanently locked for your security.
        </div>
        
      </div>
    </div>
  );
}
