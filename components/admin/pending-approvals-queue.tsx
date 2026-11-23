"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  BookOpenIcon,
  ClockIcon,
  InboxIcon,
  Loader2Icon,
} from "lucide-react";

import type { AdminOverviewPendingStudent } from "@/app/actions/analytics";
import { toggleStudentApproval } from "@/app/actions/approval";
import { EmptyState } from "@/components/layout/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";

export interface PendingQueueItem extends AdminOverviewPendingStudent {
  /**
   * Server-rendered relative timestamp ("just now", "3d ago"). Formatted on
   * the server so the markup is stable across hydration.
   */
  requestedLabel: string;
}

interface PendingApprovalsQueueProps {
  items: Array<PendingQueueItem>;
  /** Full queue size — the badge may exceed the eight rows listed here. */
  totalCount: number;
  className?: string;
}

function getInitials(name: string): string {
  const initials = name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "?";
}

/**
 * The admin overview's most actionable surface: students who finished
 * onboarding and are waiting for approval, oldest application first.
 *
 * Approve/Deny call the same `toggleStudentApproval` server action the users
 * table uses (it re-validates the caller's role server-side and enrolls the
 * student in their selected course on approval). Feedback is sonner toast +
 * `router.refresh()`; denial goes through ConfirmAction.
 */
function PendingApprovalsQueue({ items, totalCount, className }: PendingApprovalsQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const reviewApplication = React.useCallback(
    (item: PendingQueueItem, approved: boolean): Promise<void> =>
      new Promise<void>((resolve) => {
        setPendingId(item.id);

        startTransition(async () => {
          try {
            const formData = new FormData();
            formData.set("userId", item.id);
            formData.set("isApproved", String(approved));

            const result = await toggleStudentApproval(undefined, formData);

            if (result.error) {
              toast.error(result.error);
            } else {
              toast.success(
                approved
                  ? `${item.full_name} approved`
                  : `${item.full_name}'s application denied`
              );
              // Pull fresh queue + KPI numbers from the server.
              router.refresh();
            }
          } catch {
            toast.error("Something went wrong. Please try again.");
          } finally {
            setPendingId(null);
            resolve();
          }
        });
      }),
    [router]
  );

  return (
    <Card data-slot="pending-approvals-queue" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Pending applications
          {totalCount > 0 ? (
            <Badge variant="warning" aria-label={`${totalCount} applications waiting`}>
              {totalCount}
            </Badge>
          ) : null}
        </CardTitle>

        <CardDescription>
          Students waiting for approval, oldest application first
        </CardDescription>

        {items.length > 0 ? (
          <CardAction>
            <Link
              href="/admin/users?status=pending_review"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View all
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title="No applications waiting"
            description="New student applications will appear here for review."
            className="border-border/60 bg-muted/30 py-10"
          />
        ) : (
          <ul data-slot="pending-approvals-list" className="divide-y">
            {items.map((item) => {
              const isRowPending = pendingId === item.id;

              return (
                <li key={item.id} data-slot="pending-approvals-item" className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                  <Avatar size="default" className="bg-muted">
                    {item.avatar_url ? <AvatarImage src={item.avatar_url} alt="" /> : null}
                    <AvatarFallback>{getInitials(item.full_name)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate text-sm font-medium">{item.full_name}</p>
                    <p className="text-muted-foreground truncate text-xs">{item.email}</p>

                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <BookOpenIcon aria-hidden="true" className="size-3 shrink-0" />
                        <span className="truncate">
                          {item.courseTitle ?? "No course selected"}
                        </span>
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <ClockIcon aria-hidden="true" className="size-3 shrink-0" />
                        Applied {item.requestedLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      disabled={isPending}
                      onClick={() => void reviewApplication(item, true)}
                    >
                      {isRowPending ? (
                        <Loader2Icon data-icon="inline-start" aria-hidden="true" className="animate-spin" />
                      ) : null}
                      Approve
                    </Button>

                    <ConfirmAction
                      trigger={
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isPending && !isRowPending}
                        >
                          Deny
                        </Button>
                      }
                      title="Deny this application?"
                      description={`${item.full_name} will remain unapproved and can be revisited later under People.`}
                      confirmLabel="Deny application"
                      destructive
                      onConfirm={() => reviewApplication(item, false)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export { PendingApprovalsQueue };
export type { PendingApprovalsQueueProps };
