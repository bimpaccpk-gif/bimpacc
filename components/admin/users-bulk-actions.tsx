"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Loader2, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bulkDeleteUsers } from "@/app/actions/user-management";
import { bulkApproveStudents } from "@/app/actions/approval";
import { bulkEnrollStudents } from "@/app/actions/course";
import type { AdminCourseRow } from "@/components/admin/users-data-table";

type BulkActionResult = { error: string; success: string };
type BulkServerAction = (
  prevState: BulkActionResult | undefined,
  formData: FormData
) => Promise<BulkActionResult>;

/**
 * Shared plumbing for the bulk flows: runs one server action with pending
 * state, reports the outcome via sonner toast (never window.alert) and
 * refreshes the server-rendered grid afterwards.
 */
function useBulkAction() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const run = React.useCallback(
    (
      action: BulkServerAction,
      formData: FormData,
      options?: { onSuccess?: () => void }
    ) => {
      startTransition(async () => {
        try {
          const result = await action(undefined, formData);

          if (result.error) {
            toast.error(result.error);
            return;
          }

          toast.success(result.success);
          options?.onSuccess?.();
          router.refresh();
        } catch {
          toast.error("Something went wrong. Please try again.");
        }
      });
    },
    [router]
  );

  return { pending, run };
}

function toFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

interface BulkApproveSelectedButtonProps {
  userIds: string[];
  onCompleted: () => void;
}

/**
 * Approves every selected student in one shot (and enrolls them into their
 * requested course where applicable). Non-destructive, so it acts directly —
 * the old screen did the same via a plain submit button.
 */
function BulkApproveSelectedButton({
  userIds,
  onCompleted,
}: BulkApproveSelectedButtonProps) {
  const { pending, run } = useBulkAction();

  return (
    <Button
      variant="success"
      size="sm"
      disabled={pending || userIds.length === 0}
      onClick={() =>
        run(bulkApproveStudents, toFormData({ userIds: JSON.stringify(userIds) }), {
          onSuccess: onCompleted,
        })
      }
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <CheckCheck aria-hidden="true" />
      )}
      Approve selected ({userIds.length})
    </Button>
  );
}

interface UsersBulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  onCompleted: () => void;
}

function UsersBulkDeleteDialog({
  open,
  onOpenChange,
  userIds,
  onCompleted,
}: UsersBulkDeleteDialogProps) {
  const { pending, run } = useBulkAction();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="size-5" aria-hidden="true" />
            Delete selected users
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <strong className="text-foreground">{userIds.length} user(s)</strong>?
            This action cannot be undone. All their enrollments and data will also be
            removed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || userIds.length === 0}
            onClick={() =>
              run(
                bulkDeleteUsers,
                toFormData({ userIds: JSON.stringify(userIds) }),
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    onCompleted();
                  },
                }
              )
            }
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            Delete {userIds.length} user(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UsersBulkEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  courses: AdminCourseRow[];
  onCompleted: () => void;
}

function UsersBulkEnrollDialog({
  open,
  onOpenChange,
  userIds,
  courses,
  onCompleted,
}: UsersBulkEnrollDialogProps) {
  const { pending, run } = useBulkAction();
  const [courseId, setCourseId] = React.useState("");

  // Reset the course choice each time the dialog opens.
  React.useEffect(() => {
    if (open) setCourseId("");
  }, [open]);

  const publishedCourses = courses.filter((course) => course.status === "published");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId) return;

    run(
      bulkEnrollStudents,
      toFormData({ studentIds: JSON.stringify(userIds), courseId }),
      {
        onSuccess: () => {
          onOpenChange(false);
          onCompleted();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" aria-hidden="true" />
            Bulk enroll students
          </DialogTitle>
          <DialogDescription>
            Enroll{" "}
            <span className="text-foreground font-semibold">
              {userIds.length} student(s)
            </span>{" "}
            into a published course.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-enroll-course">Select course</Label>
            <Select value={courseId || null} onValueChange={(value) => setCourseId(value ?? "")}>
              <SelectTrigger id="bulk-enroll-course" className="w-full">
                <SelectValue placeholder="Select a course…" />
              </SelectTrigger>
              <SelectContent>
                {publishedCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                    {course.batch ? ` (Batch ${course.batch})` : ""}
                  </SelectItem>
                ))}
                {publishedCourses.length === 0 && (
                  <SelectItem value="none" disabled>
                    No published courses available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !courseId}>
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              Confirm enrollment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export {
  BulkApproveSelectedButton,
  UsersBulkDeleteDialog,
  UsersBulkEnrollDialog,
};
