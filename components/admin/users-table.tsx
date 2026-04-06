"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleSelect } from "@/components/admin/role-select";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { ApprovalToggle } from "@/components/admin/approval-toggle";
import { StudentApplicationDialog } from "@/components/admin/student-application-dialog";
import { EnrollStudentDialog } from "@/components/admin/enroll-student-dialog";
import { BypassOnboardingToggle } from "@/components/admin/bypass-onboarding-toggle";
import { ShieldCheck, Clock, CheckCheck, Loader2 } from "lucide-react";
import { EnrollmentCounterBadge } from "@/components/admin/enrollment-counter-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { bulkApproveStudents } from "@/lib/supabase/actions";
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

  const [approveState, approveAction, approvePending] = useActionState(
    bulkApproveStudents,
    undefined
  );

  useEffect(() => {
    if (approveState?.success) {
      // Remove approved users from selection and update their status
      setSelectedIds([]);
      setUsers((prev) =>
        prev.map((u) =>
          selectedIds.includes(u.id) ? { ...u, is_approved: true } : u
        )
      );
    } else if (approveState?.error) {
      alert(approveState.error);
    }
  }, [approveState, selectedIds]);

  const pendingStudents = useMemo(
    () =>
      users.filter(
        (u) => u.role === "student" && u.onboarding_completed && !u.is_approved
      ),
    [users]
  );

  const pendingIds = useMemo(() => pendingStudents.map((u) => u.id), [pendingStudents]);

  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length > 0 ? [] : [...pendingIds]
    );
  }, [pendingIds]);

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
          {pendingIds.length > 0 && (
            <div className="flex items-center gap-3">
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
              <form action={approveAction}>
                <input type="hidden" name="userIds" value={JSON.stringify(selectedIds)} />
                <button
                  type="submit"
                  disabled={selectedIds.length === 0 || approvePending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-success/90"
                >
                  {approvePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Approve Selected ({selectedIds.length})
                </button>
              </form>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
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
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
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
                              {!user.is_approved && (
                                <Checkbox
                                  id={`select-${user.id}`}
                                  checked={selectedIds.includes(user.id)}
                                  onCheckedChange={() => toggleSelectOne(user.id)}
                                />
                              )}
                              <ApprovalToggle
                                userId={user.id}
                                isApproved={user.is_approved}
                                disabled={false}
                              />
                              <span className="text-muted-foreground text-xs">
                                {user.is_approved ? (
                                  <span className="font-bold text-success">Approved</span>
                                ) : (
                                  <span className="font-bold text-primary">Under Review</span>
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
                              <span className="flex items-center rounded-md bg-info/10 px-2 py-1 text-xs font-semibold text-info">
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
                              <span className="flex items-center rounded-md bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
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
                        <span className="flex w-fit items-center rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
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
                      <RoleSelect
                        userId={user.id}
                        currentRole={user.role as UserRole}
                        currentUserId={currentUserId}
                      />
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
                        <DeleteUserButton
                          userId={user.id}
                          userName={user.full_name}
                          onDeleteSuccess={() => handleDeleteSuccess(user.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
