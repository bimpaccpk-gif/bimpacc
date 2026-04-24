import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamOpenRouterText, type AIChatMessage } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Verify admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await req.json()) as { messages?: AIChatMessage[] };
  const { messages } = body;

  if (!messages?.length) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  const systemMessage: AIChatMessage = {
    role: "system",
    content: `You are an AI assistant for an LMS (Learning Management System) admin dashboard. You can help admins query and understand their platform data.

Available data in the system:
- Users (students, instructors, admins) with profiles, roles, enrollment status
- Courses with enrollments, progress, attendance
- Quiz attempts and scores per student
- Login history and device fingerprints
- Audit logs of admin actions
- Notifications and lesson comments

When the admin asks about data, describe what queries would be useful and provide general guidance. If they ask for specific numbers or patterns, explain how they can find that information in the dashboard.

Be concise, professional, and helpful. If you don't know something, suggest where the admin can find that information.`,
  };

  try {
    const textEncoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamOpenRouterText([systemMessage, ...messages])) {
            controller.enqueue(textEncoder.encode(chunk));
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to stream response" },
      { status: 500 }
    );
  }
}
