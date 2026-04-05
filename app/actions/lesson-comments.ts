"use server";

import { verifyAdmin, verifySession } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

/**
 * Get all comments for a lesson with user info, ordered by created_at.
 */
export async function getLessonComments(
  lessonId: string
): Promise<{ data: LessonComment[] | null; error: string }> {
  await verifySession();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("lesson_comments")
    .select(
      `
      id,
      lesson_id,
      user_id,
      content,
      parent_id,
      created_at,
      updated_at,
      users!lesson_comments_user_id_fkey (
        id,
        full_name,
        avatar_url,
        role
      )
    `
    )
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  const comments: LessonComment[] = (data ?? []).map((row) => {
    const users = row.users as unknown as {
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: string;
    } | null;
    return {
      id: row.id,
      lesson_id: row.lesson_id,
      user_id: row.user_id,
      content: row.content,
      parent_id: row.parent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user: users
        ? {
            id: users.id,
            full_name: users.full_name,
            avatar_url: users.avatar_url,
            role: users.role,
          }
        : {
            id: "",
            full_name: "Unknown User",
            avatar_url: null,
            role: "student",
          },
    };
  });

  return { data: comments, error: "" };
}

/**
 * Create a comment on a lesson. Must be authenticated and enrolled in the
 * lesson's course.
 */
export async function createLessonComment(
  lessonId: string,
  content: string,
  parentId?: string
): Promise<{ data: LessonComment | null; error: string }> {
  const session = await verifySession();

  if (!content.trim()) {
    return { data: null, error: "Comment content cannot be empty." };
  }

  if (content.length > 2000) {
    return { data: null, error: "Comment is too long (max 2000 characters)." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Get the lesson's course_id to verify enrollment
  const { data: lesson } = await admin
    .from("lessons")
    .select("course_id")
    .eq("id", lessonId)
    .single();

  if (!lesson) {
    return { data: null, error: "Lesson not found." };
  }

  // Verify enrollment (skip for admin/instructor — they have broad access)

  const { data: userProfile } = await admin
    .from("users")
    .select("role")
    .eq("id", session.userId)
    .single();

  const userRole = (userProfile as { role: string } | null)?.role ?? "student";

  if (userRole === "student" && lesson.course_id) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", session.userId)
      .eq("course_id", lesson.course_id)
      .single();

    if (!enrollment) {
      return {
        data: null,
        error: "You are not enrolled in this course.",
      };
    }
  }

  // Validate parentId exists if provided
  if (parentId) {
    const { data: parentComment } = await supabase
      .from("lesson_comments")
      .select("id, lesson_id")
      .eq("id", parentId)
      .single();

    if (!parentComment) {
      return { data: null, error: "Parent comment not found." };
    }

    if ((parentComment as { lesson_id: string }).lesson_id !== lessonId) {
      return {
        data: null,
        error: "Parent comment does not belong to this lesson.",
      };
    }
  }

  const { data, error } = await supabase
    .from("lesson_comments")
    .insert({
      lesson_id: lessonId,
      user_id: session.userId,
      content: content.trim(),
      parent_id: parentId ?? null,
    } as never)
    .select(
      `
      id,
      lesson_id,
      user_id,
      content,
      parent_id,
      created_at,
      updated_at,
      users!lesson_comments_user_id_fkey (
        id,
        full_name,
        avatar_url,
        role
      )
    `
    )
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  const users = data.users as unknown as {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null;

  const comment: LessonComment = {
    id: data.id,
    lesson_id: data.lesson_id,
    user_id: data.user_id,
    content: data.content,
    parent_id: data.parent_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user: users
      ? {
          id: users.id,
          full_name: users.full_name,
          avatar_url: users.avatar_url,
          role: users.role,
        }
      : {
          id: session.userId,
          full_name: "Unknown User",
          avatar_url: null,
          role: userRole,
        },
  };

  return { data: comment, error: "" };
}

/**
 * Update a comment's content. Only the author can update.
 */
export async function updateLessonComment(
  commentId: string,
  content: string
): Promise<{ data: boolean; error: string }> {
  const session = await verifySession();

  if (!content.trim()) {
    return { data: false, error: "Comment content cannot be empty." };
  }

  if (content.length > 2000) {
    return { data: false, error: "Comment is too long (max 2000 characters)." };
  }

  const supabase = await createClient();

  const { data: comment } = await supabase
    .from("lesson_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return { data: false, error: "Comment not found." };
  }

  if (comment.user_id !== session.userId) {
    return { data: false, error: "You can only edit your own comments." };
  }

  const { error } = await supabase
    .from("lesson_comments")
    .update({ content: content.trim() } as never)
    .eq("id", commentId);

  if (error) {
    return { data: false, error: error.message };
  }

  return { data: true, error: "" };
}

/**
 * Delete a comment. Only the author or an admin can delete.
 */
export async function deleteLessonComment(
  commentId: string
): Promise<{ data: boolean; error: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: comment } = await supabase
    .from("lesson_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  if (!comment) {
    return { data: false, error: "Comment not found." };
  }

  // Check if admin
  let isAdmin = false;
  try {
    await verifyAdmin();
    isAdmin = true;
  } catch {
    // Not admin, fall through to author check
  }

  if (!isAdmin && comment.user_id !== session.userId) {
    return { data: false, error: "You can only delete your own comments." };
  }

  const { error } = await supabase.from("lesson_comments").delete().eq(
    "id",
    commentId
  );

  if (error) {
    return { data: false, error: error.message };
  }

  return { data: true, error: "" };
}
