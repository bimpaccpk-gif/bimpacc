export type UserRole = "admin" | "instructor" | "student";

export type HierarchyType = 1 | 2 | 3;

export interface HierarchyConfig {
  type: HierarchyType;
  name: string;
  description: string;
  hasSubjects: boolean;
  hasLessons: boolean;
  entityNames: {
    level1: string;
    level2: string;
    level3: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  onboarding_completed: boolean;
  onboarding_bypassed: boolean;
  is_approved: boolean;
  is_paused: boolean;
  selected_course_id?: string;
  // Student profile fields (populated after onboarding)
  father_name?: string;
  cnic_number?: string;
  cnic_file_path?: string;
  dob?: string;
  bank_name?: string;
  education_level?: string;
  degree_title?: string;
  degree_file_path?: string;
  profession?: string;
  whatsapp_number?: string;
  postal_address?: string;
  fee_transaction_id?: string;
  fee_submission_date?: string;
  fee_receipt_file_path?: string;
  avatar_file_path?: string;
  declaration_accepted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  batch: string;
  thumbnail_url?: string;
  instructor_id?: string;
  status: "draft" | "published" | "archived";
  registration_open: boolean;
  price?: number;
  hierarchy_type: HierarchyType;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  subject_id?: string;
  course_id?: string;
  title: string;
  description?: string;
  video_url?: string;
  content?: string;
  order_index: number;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  enrolled_by?: string | null;
  progress: number;
}

export interface LessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at?: string;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action: string;
  details: Record<string, any>;
  created_at: string;
  admin_name?: string;
}

export interface UserEnrollmentDetail {
  enrollment_id: string;
  course_id: string;
  course_title: string;
  course_batch: string | null;
  enrolled_at: string;
  enrolled_by_name: string | null;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
}

export interface UserDetailData {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    avatar_url: string | null;
    is_paused: boolean;
    is_approved: boolean;
    onboarding_completed: boolean;
    onboarding_bypassed: boolean;
    created_at: string;
    updated_at: string;
    // Student fields
    father_name: string | null;
    cnic_number: string | null;
    dob: string | null;
    bank_name: string | null;
    education_level: string | null;
    degree_title: string | null;
    profession: string | null;
    whatsapp_number: string | null;
    postal_address: string | null;
    fee_transaction_id: string | null;
    fee_submission_date: string | null;
    // Document URLs
    cnic_url: string | null;
    degree_url: string | null;
    fee_receipt_url: string | null;
    avatar_file_url: string | null;
  };
  enrollments: UserEnrollmentDetail[];
  auditLog: AuditLogEntry[];
  stats: {
    totalEnrollments: number;
    completedCourses: number;
    overallProgress: number;
    accountAgeDays: number;
  };
}
