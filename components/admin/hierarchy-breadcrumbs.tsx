import type { PageHeaderCrumb } from "@/components/layout/page-header";

/**
 * Breadcrumb trails for the admin course-content hierarchy
 * (`/admin/courses/[courseId]/...`).
 *
 * Replaces the old `HierarchyBreadcrumbs` client nav — trails are now plain
 * data handed to `PageHeader`'s `breadcrumbs` prop, so this module is
 * server-safe and renders nothing itself.
 *
 * Every href resolves to a page that actually exists: there is no dedicated
 * semester or subject detail route, so those crumbs point at the listing page
 * where the entity is managed.
 */

/** Root segments shared by every course-content page. */
const ROOT_CRUMBS: PageHeaderCrumb[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Content", href: "/admin/courses" },
];

interface CourseBreadcrumbInput {
  courseId: string;
  courseTitle: string;
  semesterId?: string;
  semesterTitle?: string;
  subjectId?: string;
  subjectTitle?: string;
  /**
   * Label for the deepest segment (the current page), e.g. "Semesters",
   * "Subjects", "Lessons", "Attendance". Omit it on the course hub itself so
   * the course title becomes the current-page crumb.
   */
  current?: string;
}

function getCourseBreadcrumbs({
  courseId,
  courseTitle,
  semesterId,
  semesterTitle,
  subjectId,
  subjectTitle,
  current,
}: CourseBreadcrumbInput): PageHeaderCrumb[] {
  const crumbs: PageHeaderCrumb[] = [
    ...ROOT_CRUMBS,
    current
      ? { label: courseTitle, href: `/admin/courses/${courseId}` }
      : { label: courseTitle },
  ];

  if (semesterId) {
    // No per-semester detail page — the trail points at the semesters list.
    crumbs.push({
      label: semesterTitle ?? "Semester",
      href: `/admin/courses/${courseId}/semesters`,
    });
  }

  if (subjectId) {
    crumbs.push({
      label: subjectTitle ?? "Subject",
      href: semesterId
        ? `/admin/courses/${courseId}/semesters/${semesterId}/subjects`
        : `/admin/courses/${courseId}/subjects`,
    });
  }

  if (current) {
    crumbs.push({ label: current });
  }

  return crumbs;
}

export { getCourseBreadcrumbs }
export type { CourseBreadcrumbInput }
