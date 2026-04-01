"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleSelect } from "@/components/admin/role-select";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { ApprovalToggle } from "@/components/admin/approval-toggle";
import { StudentApplicationDialog } from "@/components/admin/student-application-dialog";
import { EnrollStudentDialog } from "@/components/admin/enroll-student-dialog";
import { BypassOnboardingToggle } from "@/components/admin/bypass-onboarding-toggle";
import { ShieldCheck, Clock, BookOpen } from "lucide-react";
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

  const enrollmentsByUser = useMemo(() => {
    const map: Record<string, { course_id: string; title: string; batch: string | null }[]> = {};
    const list = Array.isArray(enrollments) ? enrollments : [];
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
  }, [enrollments]);

  const handleDeleteSuccess = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users</CardTitle>
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
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {user.avatar_url && (
                            <AvatarImage src={user.avatar_url} alt={user.full_name} />
                          )}
                          <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 text-xs font-medium">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
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
                                  <span className="font-bold text-green-500">Approved</span>
                                ) : (
                                  <span className="font-bold text-indigo-500">Under Review</span>
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
                              <span className="flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-500">
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
                              <span className="flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-500">
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
                        <span className="flex w-fit items-center rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-500">
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
                            <div className="group relative inline-flex">
                              <span className="inline-flex cursor-default items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                <BookOpen className="h-3 w-3" />
                                {userEnrollments.length}{" "}
                                {userEnrollments.length === 1 ? "course" : "courses"}
                              </span>
                              <div className="bg-popover pointer-events-none absolute top-full left-0 z-50 mt-1 hidden max-w-[300px] min-w-[200px] rounded-md border px-3 py-2 text-xs shadow-md group-hover:block">
                                <p className="text-popover-foreground mb-1.5 font-semibold">
                                  Enrolled Courses
                                </p>
                                <div className="space-y-1">
                                  {userEnrollments.map((enrollment) => (
                                    <div
                                      key={enrollment.course_id}
                                      className="text-popover-foreground flex items-center gap-2"
                                    >
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                      <span className="truncate">
                                        {enrollment.title}
                                        {enrollment.batch && (
                                          <span className="text-muted-foreground ml-1">
                                            (Batch {enrollment.batch})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
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
