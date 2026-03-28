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
  is_approved: boolean;
  // Student profile fields (populated after onboarding)
  father_name?: string;
  cnic_file_path?: string;
  dob?: string;
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
  progress: number;
}

export interface LessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at?: string;
}
