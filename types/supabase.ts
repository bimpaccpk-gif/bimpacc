export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "instructor" | "student";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          role?: "admin" | "instructor" | "student";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: "admin" | "instructor" | "student";
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          thumbnail_url: string | null;
          instructor_id: string;
          status: "draft" | "published" | "archived";
          price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description: string;
          thumbnail_url?: string | null;
          instructor_id: string;
          status?: "draft" | "published" | "archived";
          price?: number | null;
        };
        Update: {
          title?: string;
          description?: string;
          thumbnail_url?: string | null;
          instructor_id?: string;
          status?: "draft" | "published" | "archived";
          price?: number | null;
        };
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          video_url: string | null;
          content: string | null;
          order_index: number;
          duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          title: string;
          description?: string | null;
          video_url?: string | null;
          content?: string | null;
          order_index: number;
          duration_minutes?: number | null;
        };
        Update: {
          course_id?: string;
          title?: string;
          description?: string | null;
          video_url?: string | null;
          content?: string | null;
          order_index?: number;
          duration_minutes?: number | null;
        };
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          enrolled_at: string;
          progress: number;
        };
        Insert: {
          user_id: string;
          course_id: string;
          progress?: number;
        };
        Update: {
          user_id?: string;
          course_id?: string;
          progress?: number;
        };
      };
    };
  };
};
