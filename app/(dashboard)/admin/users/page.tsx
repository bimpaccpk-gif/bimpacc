import { Briefcase, ClipboardList, GraduationCap, Users } from "lucide-react";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/layout/stat-tile";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import {
  UsersDataTable,
  type AdminCourseRow,
  type AdminUserEnrollment,
  type AdminUserRow,
} from "@/components/admin/users-data-table";

const PAGE_SIZE = 20;

const ROLE_FILTERS = ["student", "instructor", "admin", "super_admin"] as const;
const STATUS_FILTERS = ["approved", "pending_review", "bypassed", "setup_pending"] as const;
const SORT_COLUMNS = ["created_at", "full_name"] as const;

type RoleFilter = (typeof ROLE_FILTERS)[number] | "all";
type StatusFilter = (typeof STATUS_FILTERS)[number] | "all";
type SortColumn = (typeof SORT_COLUMNS)[number];

interface UserListQuery {
  q: string;
  role: RoleFilter;
  status: StatusFilter;
  sort: SortColumn;
  dir: "asc" | "desc";
  page: number;
}

interface RawUserRow {
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

interface RawEnrollmentRow {
  user_id: string;
  course_id: string;
  courses:
    | {
        id: string;
        title: string;
        batch: string | null;
      }
    | Array<{
        id: string;
        title: string;
        batch: string | null;
      }>
    | null;
}

interface UsersPageStats {
  total: number;
  instructors: number;
  students: number;
  pendingReview: number;
}

interface UsersPageData {
  rows: AdminUserRow[];
  total: number;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Strips characters that would break the .or() ilike pattern. */
function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[%_,()]/g, " ")
    .trim()
    .slice(0, 100);
}

async function getUsersPageStats(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<UsersPageStats> {
  const [total, instructors, students, pendingReview] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "instructor"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("onboarding_completed", true)
      .eq("is_approved", false),
  ]);

  return {
    total: total.count ?? 0,
    instructors: instructors.count ?? 0,
    students: students.count ?? 0,
    pendingReview: pendingReview.count ?? 0,
  };
}

/**
 * Enrollment counts for exactly the users on this page — a single query
 * instead of one per row.
 */
async function getEnrollmentsForUsers(
  userIds: string[]
): Promise<Map<string, AdminUserEnrollment[]>> {
  if (userIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("enrollments")
    .select("user_id, course_id, courses(id, title, batch)")
    .in("user_id", userIds)
    .order("enrolled_at", { ascending: false });

  if (error) {
    console.error("Error fetching enrollments:", error);
    return new Map();
  }

  const enrollmentsByUser = new Map<string, AdminUserEnrollment[]>();
  for (const row of (data ?? []) as unknown as RawEnrollmentRow[]) {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    if (!course) continue;

    const list = enrollmentsByUser.get(row.user_id) ?? [];
    list.push({ course_id: row.course_id, title: course.title, batch: course.batch ?? null });
    enrollmentsByUser.set(row.user_id, list);
  }

  return enrollmentsByUser;
}

async function getUsersPage(query: UserListQuery): Promise<UsersPageData> {
  const supabase = await createClient();

  // Super admins are flagged via the super_admins table, not a role column —
  // load the (small) id list once for both filtering and row flags.
  const { data: superAdmins } = await supabase.from("super_admins").select("user_id");
  const superAdminIds = new Set(
    ((superAdmins ?? []) as Array<{ user_id: string }>).map((row) => row.user_id)
  );

  let usersQuery = supabase
    .from("users")
    .select(
      "id, email, full_name, role, avatar_url, onboarding_completed, onboarding_bypassed, is_approved, created_at",
      { count: "exact" }
    );

  if (query.role === "super_admin") {
    if (superAdminIds.size === 0) return { rows: [], total: 0 };
    usersQuery = usersQuery.in("id", [...superAdminIds]);
  } else if (query.role !== "all") {
    usersQuery = usersQuery.eq("role", query.role);
  }

  switch (query.status) {
    case "approved":
      usersQuery = usersQuery.eq("is_approved", true);
      break;
    case "pending_review":
      usersQuery = usersQuery
        .eq("role", "student")
        .eq("onboarding_completed", true)
        .eq("is_approved", false);
      break;
    case "bypassed":
      usersQuery = usersQuery.eq("onboarding_bypassed", true);
      break;
    case "setup_pending":
      usersQuery = usersQuery
        .eq("onboarding_completed", false)
        .eq("onboarding_bypassed", false);
      break;
  }

  if (query.q) {
    usersQuery = usersQuery.or(`full_name.ilike.%${query.q}%,email.ilike.%${query.q}%`);
  }

  usersQuery = usersQuery.order(query.sort, { ascending: query.dir === "asc" });
  if (query.sort !== "created_at") {
    usersQuery = usersQuery.order("created_at", { ascending: false });
  }

  const from = (query.page - 1) * PAGE_SIZE;
  const { data, count, error } = await usersQuery.range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error("Error fetching users:", error);
    return { rows: [], total: 0 };
  }

  const total = count ?? 0;
  const users = ((data ?? []) as unknown as RawUserRow[]).map((user) => ({
    ...user,
    is_super_admin: superAdminIds.has(user.id),
  }));

  const enrollmentsByUser = await getEnrollmentsForUsers(users.map((user) => user.id));

  const rows: AdminUserRow[] = users.map((user) => ({
    ...user,
    enrollments: enrollmentsByUser.get(user.id) ?? [],
  }));

  return { rows, total };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const currentUser = await getCurrentUser();

  const roleParam = firstParam(resolvedParams.role);
  const statusParam = firstParam(resolvedParams.status);
  const sortParam = firstParam(resolvedParams.sort);
  const parsedPage = Number.parseInt(firstParam(resolvedParams.page) ?? "1", 10);

  const query: UserListQuery = {
    q: sanitizeQuery(firstParam(resolvedParams.q) ?? ""),
    role: (ROLE_FILTERS as readonly string[]).includes(roleParam ?? "")
      ? (roleParam as RoleFilter)
      : "all",
    status: (STATUS_FILTERS as readonly string[]).includes(statusParam ?? "")
      ? (statusParam as StatusFilter)
      : "all",
    sort: (SORT_COLUMNS as readonly string[]).includes(sortParam ?? "")
      ? (sortParam as SortColumn)
      : "created_at",
    dir: firstParam(resolvedParams.dir) === "asc" ? "asc" : "desc",
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
  };

  const supabase = await createClient();
  const [{ data: coursesData }, { rows, total }, stats] = await Promise.all([
    supabase.from("courses").select("id, title, batch, status").order("title", { ascending: true }),
    getUsersPage(query),
    getUsersPageStats(supabase),
  ]);

  // A stale `page` beyond the last page would render an empty grid; fall back
  // to the final page instead.
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = query.page > totalPages && total > 0 ? totalPages : query.page;
  const currentPageRows =
    page === query.page
      ? rows
      : (await getUsersPage({ ...query, page })).rows;

  const courses: AdminCourseRow[] = ((coursesData ?? []) as AdminCourseRow[]).map((course) => ({
    ...course,
    batch: course.batch ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="View and manage all platform users" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total users" value={stats.total} icon={Users} />
        <StatTile label="Instructors" value={stats.instructors} icon={Briefcase} />
        <StatTile label="Students" value={stats.students} icon={GraduationCap} />
        <StatTile
          label="Pending review"
          value={stats.pendingReview}
          hint={stats.pendingReview > 0 ? "Applications awaiting review" : "All caught up!"}
          icon={ClipboardList}
          className={stats.pendingReview > 0 ? "ring-warning/50" : undefined}
        />
      </div>

      <UsersDataTable
        rows={currentPageRows}
        courses={courses}
        currentUserId={currentUser.id}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        createAction={<CreateUserDialog />}
      />
    </div>
  );
}
