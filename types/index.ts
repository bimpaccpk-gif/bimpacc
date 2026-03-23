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

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  instructor_id?: string;
  status: "draft" | "published" | "archived";
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
