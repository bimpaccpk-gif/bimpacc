"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 p-8">
      <div className="bg-destructive/10 rounded-full p-3">
        <AlertTriangle className="text-destructive h-8 w-8" />
      </div>
      <div className="text-center">
        <h2 className="text-foreground text-lg font-semibold">User not found</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          This user may have been deleted or you may not have permission to view them.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Link
          href="/admin/users"
          className="bg-background text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center justify-center rounded-lg border border-transparent px-3 text-sm font-medium"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Users
        </Link>
      </div>
    </div>
  );
}
