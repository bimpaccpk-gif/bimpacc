export type UserRole = "admin" | "instructor" | "student";

export type HierarchyType = 1 | 2 | 3;

export interface HierarchyConfig {
  type: HierarchyType;
  name: string;
  description: string;
  hasSemesters: boolean;
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

export interface Semester {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  course_id?: string;
  semester_id?: string;
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

export interface DeviceComponents {
  platform: string;
  platformVersion: string | null;
  screenResolution: string;
  availableScreenSize: string;
  colorDepth: number;
  devicePixelRatio: number;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  maxTouchPoints: number;
  webglRenderer: string | null;
  webglVendor: string | null;
  webglRendererRaw: string | null;
  webglVendorRaw: string | null;
  canvasFingerprint: string;
  audioFingerprint: string;
}

export interface LoginHistoryEntry {
  id: string;
  email: string;
  status: "success" | "failed_credentials" | "failed_device" | "failed_screen_record";
  device_fingerprint: string | null;
  hardware_fingerprint: string | null;
  device_components: DeviceComponents | null;
  similarity_score: number | null;
  user_agent: string | null;
  created_at: string;
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

export type ContentAccessType = "course" | "semester" | "subject" | "lesson";

export interface StudentContentAccess {
  id: string;
  user_id: string;
  content_type: ContentAccessType;
  content_id: string;
  is_paused: boolean;
  paused_by: string | null;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface ContentAccessStatus {
  isPaused: boolean;
  source: "student_override" | "global" | "parent_override" | "parent_global";
  overrideId: string | null;
}

export interface SemesterAccessNode {
  id: string;
  title: string;
  isPaused: boolean;
  studentOverride: StudentContentAccess | null;
  subjects: SubjectAccessNode[];
}

export interface CourseAccessTree {
  courseId: string;
  courseTitle: string;
  courseIsPaused: boolean;
  studentOverride: StudentContentAccess | null;
  semesters: SemesterAccessNode[];
  subjects: SubjectAccessNode[];
  directLessons: LessonAccessNode[];
}

export interface SubjectAccessNode {
  id: string;
  title: string;
  isPaused: boolean;
  studentOverride: StudentContentAccess | null;
  lessons: LessonAccessNode[];
}

export interface LessonAccessNode {
  id: string;
  title: string;
  isPaused: boolean;
  studentOverride: StudentContentAccess | null;
}

// ──────────────────────────────────────────────────────────
// Lesson Resources
// ──────────────────────────────────────────────────────────

export interface LessonResource {
  id: string;
  lesson_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────────────────
// Lesson Comments
// ──────────────────────────────────────────────────────────

export interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string | null;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface LessonCommentWithUser extends LessonComment {
  user_name: string | null;
  user_role: UserRole | null;
}

// ──────────────────────────────────────────────────────────
// Quizzes
// ──────────────────────────────────────────────────────────

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  points: number;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  created_at: string;
}

export interface UserDetailData {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_super_admin: boolean;
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
    // Device lock
    device_fingerprint: string | null;
    hardware_fingerprint: string | null;
    device_locked_at: string | null;
    device_components: DeviceComponents | null;
    is_locked: boolean;
  };
  enrollments: UserEnrollmentDetail[];
  auditLog: AuditLogEntry[];
  loginHistory: LoginHistoryEntry[];
  stats: {
    totalEnrollments: number;
    completedCourses: number;
    overallProgress: number;
    accountAgeDays: number;
  };
}

// ──────────────────────────────────────────────────────────
// Attendance
// ──────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type AttendanceSource = "csv" | "manual";

export interface AttendanceRecord {
  id: string;
  enrollment_id: string;
  session_date: string;
  status: AttendanceStatus;
  watch_time_minutes: number | null;
  session_duration_minutes: number | null;
  source: AttendanceSource;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseAttendanceDetail extends AttendanceRecord {
  student_name: string;
  student_email: string;
}
