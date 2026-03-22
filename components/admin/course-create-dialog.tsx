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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createCourse } from "@/app/actions/courses";
import { Plus, AlertCircle, Check, Loader2, ChevronDown } from "lucide-react";

export function CourseCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createCourse, undefined);
  const [status, setStatus] = useState("draft");

  if (state?.success) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-success">{state.success}</span>
        <button
          onClick={() => {
            window.location.reload();
          }}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Another
        </button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="mr-2 h-4 w-4" />
        New Course
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Course</DialogTitle>
          <DialogDescription>Add a new course to the platform</DialogDescription>
        </DialogHeader>
        <form action={action} className="mt-4 space-y-4">
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Course title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              placeholder="Course description"
              className="h-20 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <input type="hidden" name="status" value={status} />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex w-full cursor-pointer items-center justify-between rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted">
                  <span>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--anchor-width)]">
                {["draft", "published", "archived"].map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setStatus(s)}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <button
            type="submit"
            disabled={pending}
            className={buttonVariants({ className: "w-full" })}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Creating..." : "Create Course"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
