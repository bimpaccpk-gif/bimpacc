"use client";

import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleSelect } from "@/components/admin/role-select";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { ApprovalToggle } from "@/components/admin/approval-toggle";
import { StudentApplicationDialog } from "@/components/admin/student-application-dialog";
import { EnrollStudentDialog } from "@/components/admin/enroll-student-dialog";
import { BypassOnboardingToggle } from "@/components/admin/bypass-onboarding-toggle";
import { ShieldCheck, Clock } from "lucide-react";
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

interface UsersTableProps {
  initialUsers: UserRow[];
  courses: CourseRow[];
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

export function UsersTable({ initialUsers, courses, currentUserId }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers);

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
          <p className="py-8 text-center text-sm text-muted-foreground">
            No users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Status / Approval
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="pb-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {user.avatar_url && (
                            <AvatarImage
                              src={user.avatar_url}
                              alt={user.full_name}
                            />
                          )}
                          <AvatarFallback className="bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {user.email}
                    </td>
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
                              <span className="text-xs text-muted-foreground">
                                {user.is_approved ? (
                                  <span className="text-green-500 font-bold">Approved</span>
                                ) : (
                                  <span className="text-indigo-500 font-bold">Under Review</span>
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
                              <span className="flex items-center text-xs font-semibold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">
                                <ShieldCheck className="h-3 w-3 mr-1" />
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
                              <span className="flex items-center text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                                <Clock className="h-3 w-3 mr-1" />
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
                        <span className="flex items-center text-xs font-semibold text-emerald-500 bg-emerald-500/10 w-fit px-2 py-1 rounded-md">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Auto-Approved
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <RoleSelect
                        userId={user.id}
                        currentRole={user.role as UserRole}
                        currentUserId={currentUserId}
                      />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
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
