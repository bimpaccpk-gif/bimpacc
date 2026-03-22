import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleSelect } from "@/components/admin/role-select";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { Users } from "lucide-react";
import type { UserRole } from "@/types";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

async function getAllUsers(): Promise<UserRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, avatar_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return data ?? [];
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

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  const users = await getAllUsers();

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all platform users
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Instructors
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleCounts.instructor ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Students
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleCounts.student ?? 0}</div>
          </CardContent>
        </Card>
      </div>

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
                        <RoleSelect
                          userId={user.id}
                          currentRole={user.role as UserRole}
                          currentUserId={currentUser.id}
                        />
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3">
                        <DeleteUserButton
                          userId={user.id}
                          userName={user.full_name}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
