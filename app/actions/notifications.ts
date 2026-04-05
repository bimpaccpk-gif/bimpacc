"use server";

import { verifyAdmin, verifySession } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationsResult {
  unreadCount: number;
  notifications: Notification[];
}

export interface NotificationBellProps {
  notifications: Notification[];
}

/**
 * Get notifications for the logged-in user, or for a specified user if admin.
 */
export async function getUserNotifications(
  userId?: string
): Promise<{ data: NotificationsResult | null; error: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const targetUserId = userId ?? session.userId;

  if (userId && userId !== session.userId) {
    await verifyAdmin();
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  // Map DB column `read` → `is_read` in TS interface
  const notifications = (data as any[]).map((n) => ({
    id: n.id,
    user_id: n.user_id,
    title: n.title,
    message: n.message,
    type: n.type as Notification["type"],
    is_read: (n.is_read ?? n.read ?? false) as boolean,
    created_at: n.created_at,
    read_at: (n.read_at ?? null) as string | null,
  })) as Notification[];

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { data: { unreadCount, notifications }, error: "" };
}

/**
 * Mark a single notification as read. Must be the owner.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<{ data: boolean; error: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data: notification, error: fetchError } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .single();

  if (fetchError || !notification) {
    return {
      data: false,
      error: fetchError?.message ?? "Notification not found.",
    };
  }

  if (notification.user_id !== session.userId) {
    return { data: false, error: "Not authorized to mark this notification as read." };
  }

  const alreadyRead = notification.is_read ?? notification.read ?? false;
  if (alreadyRead) {
    return { data: true, error: "" };
  }

  const { error: updateError } = await supabase
    .from("notifications")
    .update({ read: true } as never)
    .eq("id", notificationId);

  if (updateError) {
    return { data: false, error: updateError.message };
  }

  return { data: true, error: "" };
}

/**
 * Mark all unread notifications as read for the current user.
 */
export async function markAllNotificationsRead(): Promise<{
  data: number;
  error: string;
}> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data, error: updateError } = await supabase
    .from("notifications")
    .update({ read: true } as never)
    .eq("user_id", session.userId)
    .eq("read", false)
    .select("id");

  if (updateError) {
    return { data: 0, error: updateError.message };
  }

  const count = (data as unknown as { id: string }[] ?? []).length;

  return { data: count, error: "" };
}

/**
 * Create a notification for a user. Admin/instructor only.
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: Notification["type"] = "info"
): Promise<{ data: Notification | null; error: string }> {
  const session = await verifySession();

  try {
    await verifyAdmin();
    // Admin can create for anyone
  } catch {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.userId)
      .single();

    const role = (profile as { role: string } | null)?.role;
    if (role !== "admin" && role !== "instructor") {
      return {
        data: null,
        error: "Unauthorized. Admin or instructor access required.",
      };
    }
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      title,
      message,
      type,
      read: false,
    } as never)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as Notification, error: "" };
}

/**
 * Delete a notification. Admin only.
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ data: boolean; error: string }> {
  try {
    await verifyAdmin();
  } catch {
    return { data: false, error: "Unauthorized. Admin access required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("notifications").delete().eq(
    "id",
    notificationId
  );

  if (error) {
    return { data: false, error: error.message };
  }

  return { data: true, error: "" };
}
