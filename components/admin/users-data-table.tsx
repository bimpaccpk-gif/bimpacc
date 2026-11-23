"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  EyeIcon,
  MoreHorizontalIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { DataTableToolbar } from "@/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { adminBypassOnboarding, adminChangeUserRole, adminDeleteUser } from "@/app/actions/user-management";
import { toggleStudentApproval } from "@/app/actions/approval";
import { StudentApplicationDialog } from "@/components/admin/student-application-dialog";
import { EnrollStudentDialog } from "@/components/admin/enroll-student-dialog";
import { EnrollmentCounterBadge } from "@/components/admin/enrollment-counter-badge";
import {
  BulkApproveSelectedButton,
  UsersBulkDeleteDialog,
  UsersBulkEnrollDialog,
} from "@/components/admin/users-bulk-actions";
import { EmptyState } from "@/components/layout/empty-state";
import type { UserRole } from "@/types";

// ─── Types ─────────────────────────────────────────────────

export interface AdminUserEnrollment {
  course_id: string;
  title: string;
  batch: string | null;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  onboarding_bypassed: boolean;
  is_approved: boolean;
  is_super_admin: boolean;
  created_at: string;
  enrollments: AdminUserEnrollment[];
}

export interface AdminCourseRow {
  id: string;
  title: string;
  batch: string | null;
  status: string;
}

interface UsersDataTableProps {
  rows: AdminUserRow[];
  courses: AdminCourseRow[];
  currentUserId: string;
  total: number;
  page: number;
  pageSize: number;
  /** Server-rendered action (e.g. CreateUserDialog) shown in the toolbar. */
  createAction?: React.ReactNode;
}

type SortColumn = "created_at" | "full_name";

interface UserActionResult {
  error: string;
  success: string;
}

const SORT_COLUMNS: readonly SortColumn[] = ["created_at", "full_name"];

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

const STICKY_HEAD_CLASS = "sticky top-0 z-10 border-b bg-card";

// ─── Helpers ───────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function userStatusLabel(user: AdminUserRow) {
  if (user.role !== "student") return "Auto-approved";
  if (user.onboarding_completed) return user.is_approved ? "Approved" : "Under review";
  return user.onboarding_bypassed ? "Onboarding bypassed" : "Pending setup";
}

/**
 * Opens a trigger button that lives inside one of the reused per-row dialogs
 * (review application / enroll / delete confirmation). The dialogs ship their
 * own triggers, so the row menu dispatches a click to the hidden trigger.
 */
function openHiddenRowTrigger(userId: string, target: string) {
  document
    .querySelector<HTMLElement>(
      `[data-user-row-actions="${userId}"] [data-action-target="${target}"] button`
    )
    ?.click();
}

// ─── Sub-components ────────────────────────────────────────

function UserStatusBadge({ user }: { user: AdminUserRow }) {
  if (user.role !== "student") {
    return (
      <Badge variant="success">
        <ShieldCheckIcon aria-hidden="true" />
        Auto-approved
      </Badge>
    );
  }

  if (user.onboarding_completed) {
    return user.is_approved ? (
      <Badge variant="success">Approved</Badge>
    ) : (
      <Badge variant="info">Under review</Badge>
    );
  }

  return user.onboarding_bypassed ? (
    <Badge variant="info">
      <ShieldCheckIcon aria-hidden="true" />
      Onboarding bypassed
    </Badge>
  ) : (
    <Badge variant="warning">
      <ClockIcon aria-hidden="true" />
      Pending setup
    </Badge>
  );
}

function exportUsersCsv(rows: AdminUserRow[]) {
  const csv = Papa.unparse(
    rows.map((user) => ({
      Name: user.full_name,
      Email: user.email,
      Role: user.is_super_admin ? "super_admin" : user.role,
      Status: userStatusLabel(user),
      Onboarding: user.onboarding_completed
        ? "completed"
        : user.onboarding_bypassed
          ? "bypassed"
          : "pending",
      Approved: user.is_approved ? "yes" : "no",
      "Enrolled courses": user.enrollments
        .map((enrollment) =>
          enrollment.batch
            ? `${enrollment.title} (Batch ${enrollment.batch})`
            : enrollment.title
        )
        .join("; "),
      Joined: formatDate(user.created_at),
    }))
  );

  // Leading BOM keeps Excel happy with non-ASCII names.
  const blob = new Blob([String.fromCharCode(0xfeff) + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ─── Main component ────────────────────────────────────────

export function UsersDataTable({
  rows,
  courses,
  currentUserId,
  total,
  page,
  pageSize,
  createAction,
}: UsersDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const roleFilter = searchParams.get("role") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";
  const sortParam = searchParams.get("sort");
  const sort: SortColumn = SORT_COLUMNS.includes(sortParam as SortColumn)
    ? (sortParam as SortColumn)
    : "created_at";
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const hasFilters = Boolean(q) || roleFilter !== "all" || statusFilter !== "all";

  /** Builds a href from the current params, dropping any that map to null/"". */
  const buildHref = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const queryString = params.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    },
    [pathname, searchParams]
  );

  /** Sets one filter param and resets pagination to the first page. */
  const applyParam = React.useCallback(
    (key: string, value: string) => {
      const normalized = !value || value === "all" ? null : value;
      router.push(buildHref({ [key]: normalized, page: null }));
    },
    [buildHref, router]
  );

  const clearFiltersHref = buildHref({
    q: null,
    role: null,
    status: null,
    sort: null,
    dir: null,
    page: null,
  });

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("q");
    applyParam("q", String(value ?? "").trim());
  }

  // ── Selection ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(new Set());
  const selectableIds = React.useMemo(
    () => rows.filter((row) => !row.is_super_admin).map((row) => row.id),
    [rows]
  );

  const allPageSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const somePageSelected = selectableIds.some((id) => selectedIds.has(id));

  const toggleAllOnPage = React.useCallback(
    (checked: boolean) => {
      setSelectedIds((previous) => {
        const next = new Set(previous);
        for (const id of selectableIds) {
          if (checked) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [selectableIds]
  );

  const toggleOne = React.useCallback((id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectedIdList = React.useMemo(() => [...selectedIds], [selectedIds]);
  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), []);

  // ── Bulk dialogs ─────────────────────────────────────────
  const [bulkMode, setBulkMode] = React.useState<"enroll" | "delete" | null>(null);
  const closeBulkMode = React.useCallback(() => setBulkMode(null), []);

  // ── Per-row server actions (role change, approve, bypass) ─
  const [isRowPending, startRowAction] = React.useTransition();

  const runUserAction = React.useCallback(
    (
      action: (
        prevState: UserActionResult | undefined,
        formData: FormData
      ) => Promise<UserActionResult>,
      userId: string,
      fields: Record<string, string>
    ) => {
      startRowAction(async () => {
        try {
          const formData = new FormData();
          for (const [key, value] of Object.entries(fields)) {
            formData.set(key, value);
          }

          const result = await action(undefined, formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          if (result.success) toast.success(result.success);
          router.refresh();
        } catch {
          toast.error("Something went wrong. Please try again.");
        }
      });
    },
    [router]
  );

  // ── Sorting ──────────────────────────────────────────────
  const sortHref = React.useCallback(
    (column: SortColumn) => {
      if (sort === column && dir === "asc") {
        return buildHref({ sort: column, dir: "desc", page: null });
      }
      if (sort === column && dir === "desc") {
        // Cycle back to the default order (joined, newest first).
        return buildHref({ sort: null, dir: null, page: null });
      }
      return buildHref({ sort: column, dir: "asc", page: null });
    },
    [buildHref, dir, sort]
  );

  function renderSortableHead(label: string, column: SortColumn) {
    const isActive = sort === column;

    return (
      <TableHead aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : undefined} className={STICKY_HEAD_CLASS}>
        <Link
          href={sortHref(column)}
          scroll={false}
          data-slot="data-table-sort-link"
          className="inline-flex items-center gap-1 rounded-sm outline-none transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {label}
          {isActive ? (
            dir === "asc" ? (
              <ArrowUpIcon aria-hidden="true" className="size-3.5" />
            ) : (
              <ArrowDownIcon aria-hidden="true" className="size-3.5" />
            )
          ) : (
            <ArrowUpDownIcon aria-hidden="true" className="size-3.5 opacity-50" />
          )}
        </Link>
      </TableHead>
    );
  }

  // ── Pagination ───────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, currentPage * pageSize);
  const pageHref = React.useCallback(
    (nextPage: number) => buildHref({ page: nextPage <= 1 ? null : String(nextPage) }),
    [buildHref]
  );
  const paginationControlClass = buttonVariants({ variant: "outline", size: "sm" });

  // EnrollStudentDialog types batch as non-null; adapt once.
  const legacyCourses = React.useMemo(
    () =>
      courses.map((course) => ({
        ...course,
        batch: course.batch ?? "",
      })),
    [courses]
  );

  return (
    <Card data-slot="users-data-table" className="gap-0 py-0">
      {/* Toolbar */}
      <div className="px-4 pt-4">
        <DataTableToolbar className="flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-64">
              <SearchIcon
                aria-hidden="true"
                className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                key={q}
                name="q"
                defaultValue={q}
                placeholder="Search by name or email…"
                aria-label="Search users by name or email"
                className="pr-8 pl-8"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => applyParam("q", "")}
                  aria-label="Clear search"
                  className="text-muted-foreground hover:bg-muted absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={roleFilter || "all"} onValueChange={(value) => value && applyParam("role", value)}>
                <SelectTrigger size="sm" className="w-[150px]" aria-label="Filter by role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="instructor">Instructors</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="super_admin">Super admins</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter || "all"} onValueChange={(value) => value && applyParam("status", value)}>
                <SelectTrigger size="sm" className="w-[180px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending_review">Under review</SelectItem>
                  <SelectItem value="bypassed">Onboarding bypassed</SelectItem>
                  <SelectItem value="setup_pending">Pending setup</SelectItem>
                </SelectContent>
              </Select>

              {hasFilters && (
                <Link href={clearFiltersHref} scroll={false} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Clear filters
                </Link>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:ml-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => {
                exportUsersCsv(rows);
                toast.success(`Exported ${rows.length} user(s) to CSV.`);
              }}
            >
              <DownloadIcon aria-hidden="true" />
              Export CSV
            </Button>
            {createAction}
          </div>
        </DataTableToolbar>

        {/* Bulk actions bar */}
        {selectedIdList.length > 0 && (
          <div
            data-slot="users-bulk-bar"
            className="bg-muted/40 mt-3 flex flex-wrap items-center gap-2 rounded-lg border p-2"
          >
            <span className="text-muted-foreground px-1 text-sm tabular-nums">
              {selectedIdList.length} selected
            </span>
            <BulkApproveSelectedButton userIds={selectedIdList} onCompleted={clearSelection} />
            <Button variant="outline" size="sm" onClick={() => setBulkMode("enroll")}>
              <UserPlusIcon aria-hidden="true" />
              Bulk enroll
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkMode("delete")}>
              <Trash2Icon aria-hidden="true" />
              Delete selected
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isRowPending}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Grid */}
      <Table className="mt-3 max-h-[60vh] overflow-y-auto">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn("w-10 pr-0", STICKY_HEAD_CLASS)}>
              <Checkbox
                checked={
                  allPageSelected ? true : somePageSelected ? "indeterminate" : false
                }
                onCheckedChange={(checked) => toggleAllOnPage(checked)}
                aria-label="Select all users on this page"
              />
            </TableHead>
            {renderSortableHead("User", "full_name")}
            <TableHead className={STICKY_HEAD_CLASS}>Email</TableHead>
            <TableHead className={STICKY_HEAD_CLASS}>Status</TableHead>
            <TableHead className={STICKY_HEAD_CLASS}>Enrolled courses</TableHead>
            <TableHead className={STICKY_HEAD_CLASS}>Role</TableHead>
            {renderSortableHead("Joined", "created_at")}
            <TableHead className={cn("text-right", STICKY_HEAD_CLASS)}>Actions</TableHead>
          </TableRow>
        </TableHeader>

        {rows.length === 0 ? (
          <TableEmpty colSpan={9}>
            <EmptyState
              icon={UsersIcon}
              title={hasFilters ? "No users match your filters" : "No users yet"}
              description={
                hasFilters
                  ? "Try adjusting the search or filters to find who you're looking for."
                  : "New accounts will appear here as soon as they are created."
              }
              action={
                hasFilters ? (
                  <Link href={clearFiltersHref} scroll={false} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Clear filters
                  </Link>
                ) : undefined
              }
              className="border-none"
            />
          </TableEmpty>
        ) : (
          <TableBody>
            {rows.map((user) => {
              const isSelected = selectedIds.has(user.id);
              const isStudent = user.role === "student";
              const canReview = isStudent && user.onboarding_completed;
              const canEnroll = isStudent;
              const canToggleApproval = isStudent && user.onboarding_completed;
              const canToggleBypass = isStudent && !user.onboarding_completed;
              const canChangeRole = !user.is_super_admin && user.id !== currentUserId;
              const canDelete = !user.is_super_admin && user.id !== currentUserId;
              const hasMenuActions =
                canReview ||
                canEnroll ||
                canToggleApproval ||
                canToggleBypass ||
                canChangeRole ||
                canDelete;

              return (
                <TableRow key={user.id} data-selected={isSelected || undefined}>
                  <TableCell className="pr-0">
                    <Checkbox
                      checked={isSelected}
                      disabled={user.is_super_admin}
                      onCheckedChange={(checked) => toggleOne(user.id, checked)}
                      aria-label={
                        user.is_super_admin
                          ? `${user.full_name} is protected from bulk actions`
                          : `Select ${user.full_name}`
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="group/userlink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="flex items-center gap-3">
                        <Avatar>
                          {user.avatar_url && (
                            <AvatarImage src={user.avatar_url} alt={user.full_name} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="group-hover/userlink:underline group-focus-visible/userlink:underline font-medium">
                          {user.full_name}
                        </span>
                      </span>
                    </Link>
                  </TableCell>

                  <TableCell className="text-muted-foreground max-w-[240px] truncate">
                    {user.email}
                  </TableCell>

                  <TableCell>
                    <UserStatusBadge user={user} />
                  </TableCell>

                  <TableCell>
                    {isStudent ? (
                      <EnrollmentCounterBadge
                        userId={user.id}
                        userName={user.full_name}
                        enrollments={user.enrollments}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {user.is_super_admin ? (
                      <Badge className="border-transparent bg-primary/10 text-primary dark:bg-primary/20">
                        <ShieldCheckIcon aria-hidden="true" />
                        Super admin
                      </Badge>
                    ) : (
                      <span className="capitalize">{user.role}</span>
                    )}
                  </TableCell>

                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDate(user.created_at)}
                  </TableCell>

                  <TableCell className="text-right">
                    {hasMenuActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={isRowPending}
                              aria-label={`Actions for ${user.full_name}`}
                            >
                              <MoreHorizontalIcon aria-hidden="true" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem render={<Link href={`/admin/users/${user.id}`} />}>
                            View profile
                          </DropdownMenuItem>

                          {canReview && (
                            <DropdownMenuItem
                              onClick={() => openHiddenRowTrigger(user.id, "review")}
                            >
                              <EyeIcon aria-hidden="true" />
                              Review application
                            </DropdownMenuItem>
                          )}

                          {canToggleApproval && (
                            <DropdownMenuItem
                              onClick={() =>
                                runUserAction(toggleStudentApproval, user.id, {
                                  userId: user.id,
                                  isApproved: (!user.is_approved).toString(),
                                })
                              }
                            >
                              {user.is_approved ? "Revoke approval" : "Approve student"}
                            </DropdownMenuItem>
                          )}

                          {canToggleBypass && (
                            <DropdownMenuItem
                              onClick={() =>
                                runUserAction(adminBypassOnboarding, user.id, {
                                  userId: user.id,
                                  bypass: (!user.onboarding_bypassed).toString(),
                                })
                              }
                            >
                              <ShieldCheckIcon aria-hidden="true" />
                              {user.onboarding_bypassed ? "Restore onboarding" : "Bypass onboarding"}
                            </DropdownMenuItem>
                          )}

                          {canEnroll && (
                            <DropdownMenuItem
                              onClick={() => openHiddenRowTrigger(user.id, "enroll")}
                            >
                              <UserPlusIcon aria-hidden="true" />
                              Enroll in course
                            </DropdownMenuItem>
                          )}

                          {canChangeRole && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {ROLE_OPTIONS.map((option) => (
                                    <DropdownMenuItem
                                      key={option.value}
                                      onClick={() =>
                                        runUserAction(adminChangeUserRole, user.id, {
                                          userId: user.id,
                                          role: option.value,
                                        })
                                      }
                                    >
                                      <span className="flex w-full items-center justify-between">
                                        <span>{option.label}</span>
                                        {user.role === option.value && (
                                          <span aria-hidden="true" className="text-xs">
                                            •
                                          </span>
                                        )}
                                      </span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </>
                          )}

                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => openHiddenRowTrigger(user.id, "delete")}
                              >
                                <Trash2Icon aria-hidden="true" />
                                Delete user
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        )}
      </Table>

      {/* Pagination */}
      <div
        data-slot="users-data-table-pagination"
        className="mt-3 flex flex-col-reverse items-center gap-2 border-t px-4 py-3 sm:flex-row sm:justify-between"
      >
        <p className="text-muted-foreground text-xs tabular-nums">
          {rangeStart}–{rangeEnd} of {total}
        </p>
        <div className="flex items-center gap-2">
          {currentPage > 1 ? (
            <Link
              href={pageHref(currentPage - 1)}
              scroll={false}
              aria-label="Go to previous page"
              className={paginationControlClass}
            >
              <ChevronLeftIcon aria-hidden="true" />
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(paginationControlClass, "pointer-events-none opacity-50")}>
              <ChevronLeftIcon aria-hidden="true" />
              Previous
            </span>
          )}
          {currentPage < totalPages ? (
            <Link
              href={pageHref(currentPage + 1)}
              scroll={false}
              aria-label="Go to next page"
              className={paginationControlClass}
            >
              Next
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(paginationControlClass, "pointer-events-none opacity-50")}>
              Next
              <ChevronRightIcon aria-hidden="true" />
            </span>
          )}
        </div>
      </div>

      {/* Bulk dialogs */}
      <UsersBulkEnrollDialog
        open={bulkMode === "enroll"}
        onOpenChange={(open) => !open && closeBulkMode()}
        userIds={selectedIdList}
        courses={courses}
        onCompleted={clearSelection}
      />
      <UsersBulkDeleteDialog
        open={bulkMode === "delete"}
        onOpenChange={(open) => !open && closeBulkMode()}
        userIds={selectedIdList}
        onCompleted={clearSelection}
      />

      {/* Hidden per-row dialogs reused by the actions menu */}
      {rows.map((user) => {
        const isStudent = user.role === "student";
        const canReview = isStudent && user.onboarding_completed;
        const canEnroll = isStudent;
        const canDelete = !user.is_super_admin && user.id !== currentUserId;

        if (!canReview && !canEnroll && !canDelete) return null;

        return (
          <div key={`actions-${user.id}`} data-user-row-actions={user.id} className="hidden" aria-hidden="true">
            {canReview && (
              <div data-action-target="review">
                <StudentApplicationDialog
                  userId={user.id}
                  studentName={user.full_name}
                  isApproved={user.is_approved}
                />
              </div>
            )}
            {canEnroll && (
              <div data-action-target="enroll">
                <EnrollStudentDialog
                  studentId={user.id}
                  studentName={user.full_name}
                  courses={legacyCourses}
                  enrolledCourseIds={user.enrollments.map((enrollment) => enrollment.course_id)}
                  onEnroll={() => router.refresh()}
                />
              </div>
            )}
            {canDelete && (
              <div data-action-target="delete">
                <ConfirmAction
                  trigger={
                    <Button variant="ghost" size="icon-xs">
                      <Trash2Icon aria-hidden="true" className="text-destructive" />
                    </Button>
                  }
                  title={`Delete ${user.full_name}?`}
                  description={`This permanently removes ${user.email}, along with all their enrollments and data. This action cannot be undone.`}
                  confirmLabel="Delete user"
                  onConfirm={async () => {
                    const formData = new FormData();
                    formData.set("userId", user.id);

                    const result = await adminDeleteUser(undefined, formData);
                    if (result.error) {
                      toast.error(result.error);
                      throw new Error(result.error);
                    }

                    toast.success(result.success);
                    setSelectedIds((previous) => {
                      const next = new Set(previous);
                      next.delete(user.id);
                      return next;
                    });
                    router.refresh();
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
