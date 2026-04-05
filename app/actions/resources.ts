"use server";

import { verifyAdmin, verifySession } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface LessonResource {
  id: string;
  lesson_id: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all resources attached to a lesson.
 * No specific auth needed beyond an active session — RLS handles access control.
 */
export async function getLessonResources(
  lessonId: string
): Promise<{ data: LessonResource[] | null; error: string }> {
  await verifySession();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lesson_resources")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: "" };
}

/**
 * Upload a file to the lesson_resources storage bucket and create a DB record.
 * Admin/instructor only.
 */
export async function uploadLessonResource(
  lessonId: string,
  file: File
): Promise<{ data: string | null; error: string }> {
  const supabase = await createClient();

  try {
    await verifyAdmin();
  } catch {
    return { data: null, error: "Unauthorized. Admin access required." };
  }

  const timestamp = Date.now();
  const safeFileName = `${lessonId}/${timestamp}-${file.name}`;

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("lesson_resources")
    .upload(safeFileName, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const { data, error: dbError } = await supabase
    .from("lesson_resources")
    .insert({
      lesson_id: lessonId,
      file_name: safeFileName,
      original_name: file.name,
      file_path: safeFileName,
      file_size: file.size,
      mime_type: file.type,
    } as never)
    .select("id")
    .single();

  if (dbError) {
    // Clean up the uploaded file if DB insert fails
    await supabase.storage.from("lesson_resources").remove([safeFileName]);
    return { data: null, error: dbError.message };
  }

  return { data: data.id, error: "" };
}

/**
 * Delete a lesson resource — removes both the DB record and the storage file.
 * Admin/instructor only.
 */
export async function deleteLessonResource(
  resourceId: string
): Promise<{ data: boolean; error: string }> {
  const supabase = await createClient();

  try {
    await verifyAdmin();
  } catch {
    return { data: false, error: "Unauthorized. Admin access required." };
  }

  const { data: resource, error: fetchError } = await supabase
    .from("lesson_resources")
    .select("file_path")
    .eq("id", resourceId)
    .single();

  if (fetchError || !resource) {
    return {
      data: false,
      error: fetchError?.message ?? "Resource not found.",
    };
  }

  const { error: dbError } = await supabase
    .from("lesson_resources")
    .delete()
    .eq("id", resourceId);

  if (dbError) {
    return { data: false, error: dbError.message };
  }

  const { error: storageError } = await supabase.storage
    .from("lesson_resources")
    .remove([resource.file_path]);

  if (storageError) {
    console.error(
      "Failed to remove file from storage:",
      resource.file_path,
      storageError.message
    );
  }

  return { data: true, error: "" };
}

/*
 * Supabase Storage Bucket RLS Setup for `lesson_resources`:
 *
 * In the Supabase dashboard or via SQL migration, configure the bucket policies:
 *
 * -- Allow admins and instructors to upload
 * CREATE POLICY "Allow admin and instructor upload"
 *   ON storage.objects FOR INSERT
 *   TO authenticated
 *   WITH CHECK (
 *     bucket_id = 'lesson_resources'
 *     AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'instructor')
 *   );
 *
 * -- Allow all authenticated users (students) to download
 * CREATE POLICY "Allow all authenticated download"
 *   ON storage.objects FOR SELECT
 *   TO authenticated
 *   USING (bucket_id = 'lesson_resources');
 *
 * -- Allow admins and instructors to delete files
 * CREATE POLICY "Allow admin and instructor delete"
 *   ON storage.objects FOR DELETE
 *   TO authenticated
 *   USING (
 *     bucket_id = 'lesson_resources'
 *     AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'instructor')
 *   );
 */
