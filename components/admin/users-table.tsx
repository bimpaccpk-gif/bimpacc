"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RoleSelect } from "@/components/admin/role-select";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { ApprovalToggle } from "@/components/admin/approval-toggle";
import { StudentApplicationDialog } from "@/components/admin/student-application-dialog";
import { EnrollStudentDialog } from "@/components/admin/enroll-student-dialog";
import { BypassOnboardingToggle } from "@/components/admin/bypass-onboarding-toggle";
import {
  ShieldCheck,
  Clock,
  CheckCheck,
  Loader2,
  Search,
  Filter,
  Trash2,
  UserPlus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { EnrollmentCounterBadge } from "@/components/admin/enrollment-counter-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { bulkApproveStudents, bulkDeleteUsers } from "@/lib/supabase/actions";
import { bulkEnrollStudents } from "@/app/actions/course";
import type { UserRole } from "@/types";

interface UserRow {
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
}

interface CourseRow {
  id: string;
  title: string;
  batch: string;
  status: string;
}

interface EnrollmentRow {
  user_id: string;
  course_id: string;
  courses: {
    id: string;
    title: string;
    batch: string | null;
  } | null;
}

interface UsersTableProps {
  initialUsers: UserRow[];
  courses: CourseRow[];
  enrollments: EnrollmentRow[];
  currentUserId: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
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

export function UsersTable({ initialUsers, courses, enrollments, currentUserId }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [allEnrollments, setAllEnrollments] = useState(enrollments);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [onboardingFilter, setOnboardingFilter] = useState<string>("all");

  // Bulk action dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // Sync prop changes (e.g. from router.refresh()) to local state
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setAllEnrollments(enrollments);
  }, [enrollments]);

  const [approveState, approveAction, approvePending] = useActionState(
    bulkApproveStudents,
    undefined
  );

  const [deleteState, deleteAction, deletePending] = useActionState(bulkDeleteUsers, undefined);

  const [enrollState, enrollAction, enrollPending] = useActionState(bulkEnrollStudents, undefined);

  useEffect(() => {
    if (approveState?.success) {
      // Remove approved users from selection and update their status
      setSelectedIds([]);
      setUsers((prev) =>
        prev.map((u) => (selectedIds.includes(u.id) ? { ...u, is_approved: true } : u))
      );
    } else if (approveState?.error) {
      alert(approveState.error);
    }
  }, [approveState, selectedIds]);

  useEffect(() => {
    if (deleteState?.success) {
      // Remove deleted users from the list
      setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      alert(deleteState.success);
    } else if (deleteState?.error) {
      alert(deleteState.error);
    }
  }, [deleteState, selectedIds]);

  useEffect(() => {
    if (enrollState?.success) {
      setSelectedIds([]);
      setEnrollDialogOpen(false);
      setSelectedCourseId("");
      alert(enrollState.success);
    } else if (enrollState?.error) {
      alert(enrollState.error);
    }
  }, [enrollState]);

  // Filtered users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Role filter
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "super_admin" ? user.is_super_admin : user.role === roleFilter);

      // Approval filter
      let matchesApproval = true;
      if (approvalFilter === "approved") {
        matchesApproval = user.is_approved;
      } else if (approvalFilter === "pending") {
        matchesApproval = user.role === "student" && user.onboarding_completed && !user.is_approved;
      }

      // Onboarding filter
      let matchesOnboarding = true;
      if (onboardingFilter === "completed") {
        matchesOnboarding = user.onboarding_completed;
      } else if (onboardingFilter === "bypassed") {
        matchesOnboarding = user.onboarding_bypassed;
      } else if (onboardingFilter === "pending") {
        matchesOnboarding = !user.onboarding_completed && !user.onboarding_bypassed;
      }

      return matchesSearch && matchesRole && matchesApproval && matchesOnboarding;
    });
  }, [users, searchQuery, roleFilter, approvalFilter, onboardingFilter]);

  const pendingStudents = useMemo(
    () => users.filter((u) => u.role === "student" && u.onboarding_completed && !u.is_approved),
    [users]
  );

  const pendingIds = useMemo(() => pendingStudents.map((u) => u.id), [pendingStudents]);

  const filteredUserIds = useMemo(
    () => filteredUsers.filter((user) => !user.is_super_admin).map((user) => user.id),
    [filteredUsers]
  );

  const allFilteredSelected =
    filteredUserIds.length > 0 && filteredUserIds.every((id) => selectedIds.includes(id));

  const allPendingSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => (prev.length > 0 ? [] : [...pendingIds]));
  }, [pendingIds]);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = filteredUserIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !filteredUserIds.includes(id));
      }
      return [...new Set([...prev, ...filteredUserIds])];
    });
  }, [filteredUserIds]);

  const toggleSelectOne = useCallback((userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const enrollmentsByUser = useMemo(() => {
    const map: Record<string, { course_id: string; title: string; batch: string | null }[]> = {};
    const list = Array.isArray(allEnrollments) ? allEnrollments : [];
    for (const e of list) {
      if (!e.courses) continue;
      if (!map[e.user_id]) map[e.user_id] = [];
      map[e.user_id].push({
        course_id: e.course_id,
        title: e.courses.title,
        batch: e.courses.batch,
      });
    }
    return map;
  }, [allEnrollments]);

  const handleDeleteSuccess = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Users</CardTitle>
          <div className="flex items-center gap-3">
            {pendingIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-pending"
                  checked={allPendingSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <label
                  htmlFor="select-all-pending"
                  className="text-muted-foreground cursor-pointer text-sm"
                >
                  Select all pending ({pendingIds.length})
                </label>
              </div>
            )}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">{selectedIds.length} selected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEnrollDialogOpen(true)}
                  disabled={selectedIds.length === 0}
                  className="h-8 gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  Bulk Enroll
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={selectedIds.length === 0}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            )}
            {pendingIds.length > 0 && (
              <form action={approveAction}>
                <input type="hidden" name="userIds" value={JSON.stringify(selectedIds)} />
                <button
                  type="submit"
                  disabled={selectedIds.length === 0 || approvePending}
                  className="bg-success hover:bg-success/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {approvePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Approve Selected ({selectedIds.length})
                </button>
              </form>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-sm font-medium">Filters:</span>
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border-input bg-background focus:border-ring focus:ring-ring rounded-md border px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="border-input bg-background focus:border-ring focus:ring-ring rounded-md border px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:outline-none"
            >
              <option value="all">All Approval Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending Review</option>
            </select>
            <select
              value={onboardingFilter}
              onChange={(e) => setOnboardingFilter(e.target.value)}
              className="border-input bg-background focus:border-ring focus:ring-ring rounded-md border px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:outline-none"
            >
              <option value="all">All Onboarding Status</option>
              <option value="completed">Onboarding Completed</option>
              <option value="bypassed">Onboarding Bypassed</option>
              <option value="pending">Onboarding Pending</option>
            </select>
            {(searchQuery ||
              roleFilter !== "all" ||
              approvalFilter !== "all" ||
              onboardingFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                  setApprovalFilter("all");
                  setOnboardingFilter("all");
                }}
                className="text-muted-foreground hover:bg-muted rounded-md px-3 py-1.5 text-sm"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        {(searchQuery ||
          roleFilter !== "all" ||
          approvalFilter !== "all" ||
          onboardingFilter !== "all") && (
          <div className="text-muted-foreground mb-3 text-sm">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        )}

        {filteredUsers.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            {users.length === 0 ? "No users found." : "No users match your current filters."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="w-12 pr-4 pb-3">
                    <Checkbox
                      id="select-all-filtered"
                      checked={allFilteredSelected}
                      onCheckedChange={toggleSelectAllFiltered}
                    />
                  </th>
                  <th className="text-muted-foreground pr-4 pb-3 font-medium">User</th>
                  <th className="text-muted-foreground pr-4 pb-3 font-medium">Email</th>
                  <th className="text-muted-foreground pr-4 pb-3 font-medium">Status / Approval</th>
                  <th className="text-muted-foreground pr-4 pb-3 font-medium">Enrolled Courses</th>
                  <th className="text-muted-foreground pr-4 pb-3 font-medium">Role</th>
                  <th className="text-muted-foreground pr-4 pb-3 font-medium">Joined</th>
                  <th className="text-muted-foreground pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3 pr-2">
                      <Checkbox
                        id={`select-${user.id}`}
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={() => toggleSelectOne(user.id)}
                        disabled={user.is_super_admin}
                        aria-label={
                          user.is_super_admin
                            ? `${user.full_name} is protected from bulk actions`
                            : `Select ${user.full_name}`
                        }
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="group/userlink flex items-center gap-3"
                      >
                        <Avatar className="h-8 w-8">
                          {user.avatar_url && (
                            <AvatarImage src={user.avatar_url} alt={user.full_name} />
                          )}
                          <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 text-xs font-medium">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium group-hover/userlink:underline">
                          {user.full_name}
                        </span>
                      </Link>
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">{user.email}</td>
                    <td className="py-3 pr-4">
                      {user.role === "student" ? (
                        <div className="flex items-center gap-2">
                          {user.onboarding_completed ? (
                            <div className="flex items-center gap-2">
                              <ApprovalToggle
                                userId={user.id}
                                isApproved={user.is_approved}
                                disabled={false}
                              />
                              <span className="text-muted-foreground text-xs">
                                {user.is_approved ? (
                                  <span className="text-success font-bold">Approved</span>
                                ) : (
                                  <span className="text-primary font-bold">Under Review</span>
                                )}
                              </span>
                              <StudentApplicationDialog
                                userId={user.id}
                                studentName={user.full_name}
                                isApproved={user.is_approved}
                              />
                            </div>
                          ) : user.onboarding_bypassed ? (
                            <div className="flex items-center gap-2">
                              <span className="bg-info/10 text-info flex items-center rounded-md px-2 py-1 text-xs font-semibold">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Onboarding Bypassed
                              </span>
                              <BypassOnboardingToggle
                                userId={user.id}
                                isBypassed={true}
                                onboardingCompleted={false}
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="bg-warning/10 text-warning flex items-center rounded-md px-2 py-1 text-xs font-semibold">
                                <Clock className="mr-1 h-3 w-3" />
                                Pending Setup
                              </span>
                              <BypassOnboardingToggle
                                userId={user.id}
                                isBypassed={false}
                                onboardingCompleted={false}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="bg-success/10 text-success flex w-fit items-center rounded-md px-2 py-1 text-xs font-semibold">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Auto-Approved
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {user.role === "student" ? (
                        (() => {
                          const userEnrollments = enrollmentsByUser[user.id] ?? [];
                          if (userEnrollments.length === 0) {
                            return (
                              <span className="text-muted-foreground text-xs">Not enrolled</span>
                            );
                          }
                          return (
                            <EnrollmentCounterBadge
                              userId={user.id}
                              userName={user.full_name}
                              enrollments={userEnrollments}
                            />
                          );
                        })()
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {user.is_super_admin ? (
                        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          Super Admin
                        </span>
                      ) : (
                        <RoleSelect
                          userId={user.id}
                          currentRole={user.role as UserRole}
                          currentUserId={currentUserId}
                        />
                      )}
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {user.role === "student" && (
                          <EnrollStudentDialog
                            studentId={user.id}
                            studentName={user.full_name}
                            courses={courses}
                            enrolledCourseIds={(enrollmentsByUser[user.id] ?? []).map(
                              (e) => e.course_id
                            )}
                            onEnroll={(enrollment) => {
                              setAllEnrollments((prev) => [...prev, enrollment]);
                            }}
                          />
                        )}
                        {!user.is_super_admin && (
                          <DeleteUserButton
                            userId={user.id}
                            userName={user.full_name}
                            onDeleteSuccess={() => handleDeleteSuccess(user.id)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Selected Users
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedIds.length} user(s)</strong>? This
              action cannot be undone. All their enrollments and data will also be removed.
            </DialogDescription>
          </DialogHeader>

          {deleteState?.error && (
            <div className="bg-destructive/15 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{deleteState.error}</span>
            </div>
          )}

          {deleteState?.success && !deleteState.error && (
            <div className="bg-success/15 text-success flex items-center gap-2 rounded-md p-3 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>{deleteState.success}</span>
            </div>
          )}

          <form action={deleteAction} className="mt-4 flex gap-3">
            <input type="hidden" name="userIds" value={JSON.stringify(selectedIds)} />
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={deletePending}>
              {deletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedIds.length} User(s)
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Enroll Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Bulk Enroll Students
            </DialogTitle>
            <DialogDescription>
              Enroll{" "}
              <span className="text-foreground font-semibold">{selectedIds.length} student(s)</span>{" "}
              into a published course.
            </DialogDescription>
          </DialogHeader>

          {enrollState?.success && !enrollState.error ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-6 text-center">
              <div className="bg-success/10 flex h-12 w-12 items-center justify-center rounded-full">
                <CheckCircle2 className="text-success h-6 w-6" />
              </div>
              <p className="text-success text-sm font-medium">{enrollState.success}</p>
            </div>
          ) : (
            <form action={enrollAction} className="space-y-4 py-4">
              <input type="hidden" name="studentIds" value={JSON.stringify(selectedIds)} />
              <div className="space-y-2">
                <Label htmlFor="courseId">Select Course</Label>
                <select
                  id="courseId"
                  name="courseId"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a course...
                  </option>
                  {courses
                    .filter((c) => c.status === "published")
                    .map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} {course.batch ? `(Batch ${course.batch})` : ""}
                      </option>
                    ))}
                  {courses.filter((c) => c.status === "published").length === 0 && (
                    <option value="" disabled>
                      No published courses available
                    </option>
                  )}
                </select>
              </div>

              {enrollState?.error && (
                <div className="bg-destructive/15 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{enrollState.error}</span>
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnrollDialogOpen(false)}
                  disabled={enrollPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={enrollPending || !selectedCourseId}
                  className="gap-2"
                >
                  {enrollPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Enrollment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
