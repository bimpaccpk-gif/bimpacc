"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/dal";
import { callAI } from "@/lib/ai";

// ============================================================
// 1. AI-POWERED ANALYTICS DASHBOARD
// ============================================================

export interface PredictiveAnalytics {
  enrollmentTrend: {
    label: string;
    value: number;
    trend: "up" | "down" | "stable";
    prediction: string;
  };
  dropoutRisk: {
    totalStudents: number;
    atRiskCount: number;
    atRiskPercentage: number;
    insights: string;
  };
  coursePopularity: {
    courseId: string;
    courseTitle: string;
    currentEnrollments: number;
    predictedEnrollments: number;
    trend: "rising" | "declining" | "stable";
  }[];
  revenueProjection: {
    currentMonth: number;
    projectedNextMonth: number;
    insights: string;
  };
  overallHealth: {
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
  };
}

export async function getPredictiveAnalytics(): Promise<PredictiveAnalytics> {
  await verifyAdmin();
  const supabase = await createClient();

  // Gather data for analysis
  const [{ data: enrollments }, { data: users }, { data: courses }, { data: quizAttempts }, { data: attendance }] =
    await Promise.all([
      supabase.from("enrollments").select("user_id, course_id, enrolled_at, progress"),
      supabase.from("users").select("id, role, created_at, is_approved, onboarding_completed"),
      supabase.from("courses").select("id, title, status, created_at"),
      supabase.from("quiz_attempts").select("user_id, quiz_id, score, passed, created_at"),
      supabase.from("attendance_records").select("enrollment_id, status, session_date"),
    ]);

  // Calculate enrollment trend (last 30 days vs previous 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentEnrollments =
    enrollments?.filter((e) => new Date(e.enrolled_at) >= thirtyDaysAgo).length ?? 0;
  const previousEnrollments =
    enrollments?.filter(
      (e) =>
        new Date(e.enrolled_at) >= sixtyDaysAgo && new Date(e.enrolled_at) < thirtyDaysAgo
    ).length ?? 0;

  const enrollmentChange =
    previousEnrollments > 0
      ? ((recentEnrollments - previousEnrollments) / previousEnrollments) * 100
      : 0;

  // Get lesson progress data for dropout analysis
  const { data: lessonProgress } = await supabase
    .from("lesson_progress")
    .select("enrollment_id, completed");

  // Calculate per-enrollment progress
  const enrollmentProgressMap: Record<string, { total: number; completed: number }> = {};
  for (const lp of lessonProgress ?? []) {
    if (!enrollmentProgressMap[lp.enrollment_id]) {
      enrollmentProgressMap[lp.enrollment_id] = { total: 0, completed: 0 };
    }
    enrollmentProgressMap[lp.enrollment_id].total++;
    if (lp.completed) enrollmentProgressMap[lp.enrollment_id].completed++;
  }

  // Calculate average attendance per enrollment
  const attendanceMap: Record<string, { present: number; total: number }> = {};
  for (const att of attendance ?? []) {
    if (!attendanceMap[att.enrollment_id]) {
      attendanceMap[att.enrollment_id] = { present: 0, total: 0 };
    }
    attendanceMap[att.enrollment_id].total++;
    if (att.status === "present" || att.status === "late") {
      attendanceMap[att.enrollment_id].present++;
    }
  }

  // Build data summary for AI analysis
  const dataSummary = {
    totalUsers: users?.filter((u) => u.role === "student").length ?? 0,
    totalCourses: courses?.filter((c) => c.status === "published").length ?? 0,
    totalEnrollments: enrollments?.length ?? 0,
    recentEnrollments30Days: recentEnrollments,
    previousEnrollments30Days: previousEnrollments,
    totalQuizAttempts: quizAttempts?.length ?? 0,
    quizPassRate:
      quizAttempts && quizAttempts.length > 0
        ? ((quizAttempts.filter((q) => q.passed).length / quizAttempts.length) * 100).toFixed(1)
        : "0",
    totalAttendanceRecords: attendance?.length ?? 0,
    enrollmentsWithProgress: Object.keys(enrollmentProgressMap).length,
  };

  const aiPrompt = `You are an AI analytics assistant for a Learning Management System (LMS). Analyze the following platform data and provide insights.

Data Summary:
- Total Students: ${dataSummary.totalUsers}
- Published Courses: ${dataSummary.totalCourses}
- Total Enrollments: ${dataSummary.totalEnrollments}
- New Enrollments (last 30 days): ${dataSummary.recentEnrollments30Days}
- Previous Period Enrollments: ${dataSummary.previousEnrollments30Days}
- Total Quiz Attempts: ${dataSummary.totalQuizAttempts}
- Quiz Pass Rate: ${dataSummary.quizPassRate}%
- Total Attendance Records: ${dataSummary.totalAttendanceRecords}
- Enrollments with Lesson Progress: ${dataSummary.enrollmentsWithProgress}

Provide your response in the following JSON format (output ONLY valid JSON, no markdown):
{
  "enrollmentTrend": {
    "prediction": "One sentence prediction about enrollment trends",
    "insights": "Brief analysis of enrollment patterns"
  },
  "dropoutAnalysis": {
    "insights": "Analysis of student dropout risk factors",
    "recommendations": "2-3 recommendations to reduce dropout"
  },
  "platformHealth": {
    "score": 75,
    "summary": "One sentence summary of platform health",
    "strengths": ["Strength 1", "Strength 2"],
    "weaknesses": ["Weakness 1", "Weakness 2"]
  },
  "revenueInsights": "Insights about revenue projections based on enrollment patterns"
}`;

  const aiResponse = await callAI(aiPrompt, "You are a data analyst specializing in educational platforms. Respond with ONLY valid JSON.");

  let parsed;
  try {
    const cleaned = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      enrollmentTrend: {
        prediction: "Unable to generate prediction",
        insights: "Analysis unavailable",
      },
      dropoutAnalysis: { insights: "Analysis unavailable", recommendations: [] },
      platformHealth: { score: 0, summary: "No data available", strengths: [], weaknesses: [] },
      revenueInsights: "No data available",
    };
  }

  const studentCount = dataSummary.totalUsers;
  const atRiskPercentage =
    recentEnrollments < previousEnrollments ? 25 : recentEnrollments === 0 ? 50 : 15;

  return {
    enrollmentTrend: {
      label: "Enrollment Trend",
      value: recentEnrollments,
      trend: enrollmentChange > 5 ? "up" : enrollmentChange < -5 ? "down" : "stable",
      prediction: parsed.enrollmentTrend?.prediction ?? "Trending based on recent patterns",
    },
    dropoutRisk: {
      totalStudents: studentCount,
      atRiskCount: Math.round(studentCount * (atRiskPercentage / 100)),
      atRiskPercentage,
      insights: parsed.dropoutAnalysis?.insights ?? "Review student engagement metrics",
    },
    coursePopularity:
      courses
        ?.filter((c) => c.status === "published")
        .slice(0, 5)
        .map((c) => {
          const courseEnrollments =
            enrollments?.filter((e) => e.course_id === c.id).length ?? 0;
          return {
            courseId: c.id,
            courseTitle: c.title,
            currentEnrollments: courseEnrollments,
            predictedEnrollments: Math.round(courseEnrollments * 1.15),
            trend: courseEnrollments > 5 ? "rising" : courseEnrollments > 0 ? "stable" : "declining",
          };
        }) ?? [],
    revenueProjection: {
      currentMonth: dataSummary.recentEnrollments30Days,
      projectedNextMonth: Math.round(
        dataSummary.recentEnrollments30Days *
          (1 + (enrollmentChange > -100 ? enrollmentChange / 100 : 0))
      ),
      insights: parsed.revenueInsights ?? "Based on current enrollment patterns",
    },
    overallHealth: {
      score: parsed.platformHealth?.score ?? 65,
      summary: parsed.platformHealth?.summary ?? "Platform is operational",
      strengths: parsed.platformHealth?.strengths ?? ["Active course catalog"],
      weaknesses: parsed.platformHealth?.weaknesses ?? ["Room for engagement improvement"],
    },
  };
}

// ============================================================
// 2. STUDENT RISK DETECTION
// ============================================================

export interface AtRiskStudent {
  id: string;
  name: string;
  email: string;
  riskScore: number;
  riskLevel: "high" | "medium" | "low";
  factors: string[];
  courseTitle: string;
  progressPercent: number;
  attendancePercent: number;
  quizPassRate: number;
  lastActive: string | null;
  aiRecommendation: string;
}

export async function getAtRiskStudents(): Promise<AtRiskStudent[]> {
  await verifyAdmin();
  const supabase = await createClient();

  // Get all enrolled students with their data
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, user_id, course_id, enrolled_at, progress");

  if (!enrollments?.length) return [];

  const { data: users } = await supabase.from("users").select("id, full_name, email");
  const { data: courses } = await supabase.from("courses").select("id, title");
  const { data: lessonProgress } = await supabase
    .from("lesson_progress")
    .select("enrollment_id, completed");
  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("enrollment_id, status, session_date");
  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("user_id, score, passed, created_at");

  const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);
  const courseMap = new Map(courses?.map((c) => [c.id, c]) ?? []);

  // Build per-enrollment metrics
  const enrollmentMetrics: Record<
    string,
    {
      totalLessons: number;
      completedLessons: number;
      attendancePresent: number;
      attendanceTotal: number;
      quizAttempts: number;
      quizPassed: number;
      enrollmentDate: string;
    }
  > = {};

  for (const lp of lessonProgress ?? []) {
    if (!enrollmentMetrics[lp.enrollment_id]) {
      enrollmentMetrics[lp.enrollment_id] = {
        totalLessons: 0,
        completedLessons: 0,
        attendancePresent: 0,
        attendanceTotal: 0,
        quizAttempts: 0,
        quizPassed: 0,
        enrollmentDate: "",
      };
    }
    enrollmentMetrics[lp.enrollment_id].totalLessons++;
    if (lp.completed) enrollmentMetrics[lp.enrollment_id].completedLessons++;
  }

  for (const att of attendance ?? []) {
    if (!enrollmentMetrics[att.enrollment_id]) {
      enrollmentMetrics[att.enrollment_id] = {
        totalLessons: 0,
        completedLessons: 0,
        attendancePresent: 0,
        attendanceTotal: 0,
        quizAttempts: 0,
        quizPassed: 0,
        enrollmentDate: "",
      };
    }
    enrollmentMetrics[att.enrollment_id].attendanceTotal++;
    if (att.status === "present" || att.status === "late") {
      enrollmentMetrics[att.enrollment_id].attendancePresent++;
    }
  }

  for (const qa of quizAttempts ?? []) {
    const enrollmentsForUser = enrollments.filter((e) => e.user_id === qa.user_id);
    for (const e of enrollmentsForUser) {
      if (!enrollmentMetrics[e.id]) {
        enrollmentMetrics[e.id] = {
          totalLessons: 0,
          completedLessons: 0,
          attendancePresent: 0,
          attendanceTotal: 0,
          quizAttempts: 0,
          quizPassed: 0,
          enrollmentDate: e.enrolled_at,
        };
      }
      enrollmentMetrics[e.id].quizAttempts++;
      if (qa.passed) enrollmentMetrics[e.id].quizPassed++;
    }
  }

  // Calculate risk scores and identify at-risk students
  const atRiskStudents: AtRiskStudent[] = [];

  for (const enrollment of enrollments) {
    const user = userMap.get(enrollment.user_id);
    const course = courseMap.get(enrollment.course_id);
    const metrics = enrollmentMetrics[enrollment.id];

    if (!user || !course || !metrics) continue;

    const progressPercent =
      metrics.totalLessons > 0
        ? Math.round((metrics.completedLessons / metrics.totalLessons) * 100)
        : 0;
    const attendancePercent =
      metrics.attendanceTotal > 0
        ? Math.round((metrics.attendancePresent / metrics.attendanceTotal) * 100)
        : 100;
    const quizPassRate =
      metrics.quizAttempts > 0
        ? Math.round((metrics.quizPassed / metrics.quizAttempts) * 100)
        : 100;

    // Calculate risk score (0-100, higher = more at risk)
    let riskScore = 0;
    const factors: string[] = [];

    // Low progress is a major risk factor
    if (progressPercent < 20) {
      riskScore += 35;
      factors.push(`Very low course progress (${progressPercent}%)`);
    } else if (progressPercent < 50) {
      riskScore += 20;
      factors.push(`Below-average course progress (${progressPercent}%)`);
    }

    // Poor attendance
    if (attendancePercent < 50) {
      riskScore += 30;
      factors.push(`Poor attendance (${attendancePercent}%)`);
    } else if (attendancePercent < 75) {
      riskScore += 15;
      factors.push(`Inconsistent attendance (${attendancePercent}%)`);
    }

    // Failing quizzes
    if (quizPassRate < 40) {
      riskScore += 25;
      factors.push(`Low quiz pass rate (${quizPassRate}%)`);
    } else if (quizPassRate < 70) {
      riskScore += 10;
      factors.push(`Moderate quiz pass rate (${quizPassRate}%)`);
    }

    // Inactivity (enrolled long time ago but low progress)
    const daysSinceEnrollment =
      (Date.now() - new Date(enrollment.enrolled_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceEnrollment > 30 && progressPercent < 10) {
      riskScore += 10;
      factors.push("Inactive for extended period");
    }

    if (riskScore >= 20) {
      const riskLevel: "high" | "medium" | "low" =
        riskScore >= 60 ? "high" : riskScore >= 40 ? "medium" : "low";

      // Generate AI recommendation
      const aiPrompt = `A student in your LMS has the following profile:
- Name: ${user.full_name ?? "Unknown"}
- Course: ${course.title}
- Progress: ${progressPercent}%
- Attendance: ${attendancePercent}%
- Quiz Pass Rate: ${quizPassRate}%
- Risk Score: ${riskScore}/100
- Risk Factors: ${factors.join(", ")}

Provide a brief (2-3 sentences) personalized recommendation for how the admin should intervene to help this student. Be specific and actionable.`;

      let aiRecommendation = "Monitor student engagement and reach out proactively.";
      try {
        aiRecommendation = await callAI(
          aiPrompt,
          "You are an educational advisor. Provide concise, actionable recommendations."
        );
      } catch {
        // Use default recommendation
      }

      atRiskStudents.push({
        id: enrollment.user_id,
        name: user.full_name ?? "Unknown",
        email: user.email ?? "",
        riskScore,
        riskLevel,
        factors,
        courseTitle: course.title,
        progressPercent,
        attendancePercent,
        quizPassRate,
        lastActive: enrollment.enrolled_at,
        aiRecommendation,
      });
    }
  }

  // Sort by risk score descending
  atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
  return atRiskStudents;
}

// ============================================================
// 3. AUTOMATED REPORT GENERATION
// ============================================================

export interface GeneratedReport {
  title: string;
  period: string;
  content: string;
  generatedAt: string;
  sections: {
    heading: string;
    content: string;
  }[];
}

export async function generateAutomatedReport(
  period: "weekly" | "monthly" = "weekly"
): Promise<GeneratedReport> {
  await verifyAdmin();
  const supabase = await createClient();

  const now = new Date();
  const daysAgo = period === "weekly" ? 7 : 30;
  const periodStart = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

  // Gather comprehensive data
  const [{ data: users }, { data: courses }, { data: enrollments }, { data: quizAttempts }, { data: attendance }, { data: auditLog }] =
    await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("courses").select("*"),
      supabase.from("enrollments").select("*"),
      supabase.from("quiz_attempts").select("*"),
      supabase.from("attendance_records").select("*"),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);

  const students = users?.filter((u) => u.role === "student") ?? [];
  const publishedCourses = courses?.filter((c) => c.status === "published") ?? [];
  const periodEnrollments =
    enrollments?.filter((e) => new Date(e.enrolled_at) >= periodStart) ?? [];
  const periodQuizAttempts =
    quizAttempts?.filter((q) => new Date(q.created_at) >= periodStart) ?? [];
  const periodAttendance =
    attendance?.filter((a) => new Date(a.session_date!) >= periodStart) ?? [];

  const newUsers = students.filter((u) => new Date(u.created_at) >= periodStart);
  const approvedStudents = students.filter((u) => u.is_approved);

  const dataSummary = `
PERIOD: ${periodStart.toDateString()} to ${now.toDateString()} (${daysAgo} days)

USER METRICS:
- Total Registered Users: ${users?.length ?? 0}
- New Users This Period: ${newUsers.length}
- Total Students: ${students.length}
- Approved Students: ${approvedStudents.length}
- Pending Approval: ${students.filter((u) => !u.is_approved).length}

COURSE METRICS:
- Total Courses: ${courses?.length ?? 0}
- Published Courses: ${publishedCourses.length}
- Draft Courses: ${courses?.filter((c) => c.status === "draft").length ?? 0}
- New Enrollments: ${periodEnrollments.length}
- Total Enrollments: ${enrollments?.length ?? 0}

ASSESSMENT METRICS:
- Total Quiz Attempts: ${quizAttempts?.length ?? 0}
- Quiz Attempts This Period: ${periodQuizAttempts.length}
- Quiz Pass Rate: ${periodQuizAttempts.length > 0 ? ((periodQuizAttempts.filter((q) => q.passed).length / periodQuizAttempts.length) * 100).toFixed(1) : 0}%

ATTENDANCE METRICS:
- Total Attendance Records: ${periodAttendance.length}
- Attendance Rate: ${periodAttendance.length > 0 ? ((periodAttendance.filter((a) => a.status === "present" || a.status === "late").length / periodAttendance.length) * 100).toFixed(1) : 0}%

ADMIN ACTIVITY:
- Recent Admin Actions: ${auditLog?.length ?? 0}
`;

  const aiPrompt = `You are an AI reporting assistant for a Learning Management System (LMS). Based on the data below, generate a comprehensive ${period} report.

${dataSummary}

Generate the report with these sections:
1. Executive Summary - A brief overview of the platform's status this period
2. Student Engagement - Analysis of student activity, progress, and engagement levels
3. Course Performance - How courses are performing, enrollment trends
4. Assessment Results - Quiz performance and academic outcomes
5. Attendance Overview - Attendance patterns and insights
6. Recommendations - 3-5 actionable recommendations for improvement

Format the response as a professional report. Use bullet points where appropriate. Be specific with numbers and trends.`;

  const reportContent = await callAI(
    aiPrompt,
    `You are a professional educational report writer. Generate detailed, insightful reports based on data.`
  );

  // Parse into sections
  const sections: { heading: string; content: string }[] = [];
  const sectionRegex = /^#{1,3}\s+(.+)$/gm;
  let match;
  const lines = reportContent.split("\n");
  let currentHeading = "";
  let currentContent = "";

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.trim() });
      }
      currentHeading = headingMatch[1];
      currentContent = "";
    } else {
      currentContent += line + "\n";
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.trim() });
  }

  // Fallback if parsing failed
  if (sections.length === 0) {
    sections.push({ heading: "Report", content: reportContent });
  }

  return {
    title: `${period === "weekly" ? "Weekly" : "Monthly"} LMS Report`,
    period: `${periodStart.toDateString()} - ${now.toDateString()}`,
    content: reportContent,
    generatedAt: now.toISOString(),
    sections,
  };
}

// ============================================================
// 4. SMART ENROLLMENT RECOMMENDATIONS
// ============================================================

export interface EnrollmentRecommendation {
  userId: string;
  userName: string;
  userEmail: string;
  educationLevel: string | null;
  currentCourses: string[];
  recommendedCourses: {
    courseId: string;
    courseTitle: string;
    batch: string | null;
    reason: string;
    matchScore: number;
  }[];
}

export async function getEnrollmentRecommendations(): Promise<EnrollmentRecommendation[]> {
  await verifyAdmin();
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, education_level, profession, selected_course_id")
    .eq("role", "student");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, batch, description, status")
    .eq("status", "published");

  const { data: enrollments } = await supabase.from("enrollments").select("user_id, course_id");
  const { data: allLessons } = await supabase.from("lessons").select("id, course_id, title, content");
  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("user_id, score, passed");

  if (!users?.length || !courses?.length) return [];

  const userCoursesMap: Record<string, string[]> = {};
  for (const e of enrollments ?? []) {
    if (!userCoursesMap[e.user_id]) userCoursesMap[e.user_id] = [];
    userCoursesMap[e.user_id].push(e.course_id);
  }

  const userQuizMap: Record<string, { avgScore: number; passRate: number }> = {};
  for (const userId of users.map((u) => u.id)) {
    const userAttempts = quizAttempts?.filter((q) => q.user_id === userId) ?? [];
    if (userAttempts.length > 0) {
      const avgScore =
        userAttempts.reduce((sum, q) => sum + (q.score ?? 0), 0) / userAttempts.length;
      const passRate = userAttempts.filter((q) => q.passed).length / userAttempts.length;
      userQuizMap[userId] = { avgScore, passRate };
    }
  }

  const recommendations: EnrollmentRecommendation[] = [];

  for (const user of users) {
    const enrolledCourseIds = userCoursesMap[user.id] ?? [];
    const availableCourses = courses.filter((c) => !enrolledCourseIds.includes(c.id));

    if (availableCourses.length === 0) continue;

    // Build AI prompt for course matching
    const quizData = userQuizMap[user.id]
      ? `\n- Average Quiz Score: ${userQuizMap[user.id].avgScore.toFixed(1)}%
- Quiz Pass Rate: ${(userQuizMap[user.id].passRate * 100).toFixed(0)}%`
      : "";

    const aiPrompt = `You are an AI academic advisor. Based on the student's profile and available courses, recommend which courses they should enroll in next.

STUDENT PROFILE:
- Name: ${user.full_name ?? "Unknown"}
- Education Level: ${user.education_level ?? "Not specified"}
- Profession: ${user.profession ?? "Not specified"}${quizData}
- Currently Enrolled In: ${enrolledCourseIds.length > 0 ? enrolledCourseIds.map((id) => courses.find((c) => c.id === id)?.title).filter(Boolean).join(", ") : "No courses yet"}

AVAILABLE COURSES:
${availableCourses.map((c) => `- ${c.title} (Batch: ${c.batch ?? "N/A"})${c.description ? `: ${c.description.substring(0, 100)}` : ""}`).join("\n")}

Return ONLY a JSON array of recommended courses with reasons and match scores (0-100). Max 3 recommendations.
Format: [{"courseId": "id", "reason": "why this course", "matchScore": 85}]`;

    let courseRecommendations: { courseId: string; reason: string; matchScore: number }[] = [];
    try {
      const response = await callAI(
        aiPrompt,
        "You are an academic advisor. Respond with ONLY a JSON array of course recommendations."
      );
      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      courseRecommendations = JSON.parse(cleaned);
    } catch {
      // Fallback: recommend all available courses
      courseRecommendations = availableCourses.slice(0, 2).map((c) => ({
        courseId: c.id,
        reason: "Matches your academic interests",
        matchScore: 50,
      }));
    }

    if (courseRecommendations.length > 0) {
      const recommendedCourses = courseRecommendations
        .map((rec) => {
          const course = courses.find((c) => c.id === rec.courseId);
          return course
            ? {
                courseId: course.id,
                courseTitle: course.title,
                batch: course.batch,
                reason: rec.reason,
                matchScore: rec.matchScore,
              }
            : null;
        })
        .filter(Boolean);

      recommendations.push({
        userId: user.id,
        userName: user.full_name ?? "Unknown",
        userEmail: user.email ?? "",
        educationLevel: user.education_level,
        currentCourses: enrolledCourseIds
          .map((id) => courses.find((c) => c.id === id)?.title)
          .filter(Boolean) as string[],
        recommendedCourses: recommendedCourses as EnrollmentRecommendation["recommendedCourses"],
      });
    }
  }

  // Sort by highest match score first
  recommendations.sort(
    (a, b) =>
      (b.recommendedCourses[0]?.matchScore ?? 0) - (a.recommendedCourses[0]?.matchScore ?? 0)
  );

  return recommendations;
}

// ============================================================
// 5. ANOMALY DETECTION
// ============================================================

export interface AnomalyReport {
  id: string;
  type: "engagement_drop" | "suspicious_quiz" | "device_sharing" | "login_pattern" | "enrollment_spike";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  affectedUsers: string[];
  detectedAt: string;
  aiAnalysis: string;
  recommendedAction: string;
}

export async function detectAnomalies(): Promise<AnomalyReport[]> {
  await verifyAdmin();
  const supabase = await createClient();

  const [{ data: users }, { data: enrollments }, { data: quizAttempts }, { data: loginHistory }] =
    await Promise.all([
      supabase.from("users").select("id, full_name, email, device_fingerprint, role, created_at"),
      supabase.from("enrollments").select("user_id, course_id, enrolled_at"),
      supabase.from("quiz_attempts").select("user_id, quiz_id, score, created_at"),
      supabase.from("login_history").select("user_id, email, device_fingerprint, hardware_fingerprint, status, created_at"),
    ]);

  const anomalies: AnomalyReport[] = [];
  const now = new Date();

  // 1. Detect device sharing (same fingerprint across multiple students)
  const studentLogins = loginHistory?.filter(
    (l) => users?.some((u) => u.id === l.user_id && u.role === "student")
  );

  const fingerprintMap: Record<string, string[]> = {};
  for (const login of studentLogins ?? []) {
    if (login.device_fingerprint) {
      if (!fingerprintMap[login.device_fingerprint]) {
        fingerprintMap[login.device_fingerprint] = [];
      }
      if (!fingerprintMap[login.device_fingerprint].includes(login.user_id)) {
        fingerprintMap[login.device_fingerprint].push(login.user_id);
      }
    }
  }

  for (const [fingerprint, userIds] of Object.entries(fingerprintMap)) {
    if (userIds.length > 1) {
      const affectedNames =
        users
          ?.filter((u) => userIds.includes(u.id))
          .map((u) => u.full_name ?? u.email)
          .join(", ") ?? "Unknown users";

      const aiPrompt = `Multiple students (${affectedNames}) are logging in from the same device (fingerprint: ${fingerprint.substring(0, 20)}...). This could indicate account sharing, a computer lab, or fraud. What action should the admin take? Respond in 2-3 sentences.`;

      let aiAnalysis = "Investigate shared device usage pattern.";
      try {
        aiAnalysis = await callAI(
          aiPrompt,
          "You are a security analyst. Provide concise recommendations."
        );
      } catch {}

      anomalies.push({
        id: `device_share_${fingerprint.substring(0, 12)}`,
        type: "device_sharing",
        severity: "high",
        title: "Potential Device Sharing Detected",
        description: `${userIds.length} students using the same device fingerprint`,
        affectedUsers: userIds,
        detectedAt: now.toISOString(),
        aiAnalysis,
        recommendedAction: "Contact affected students and verify identity. Consider resetting device fingerprints.",
      });
    }
  }

  // 2. Detect suspicious quiz patterns (multiple perfect scores in short time)
  const recentQuizAttempts =
    quizAttempts?.filter((q) => {
      const attemptDate = new Date(q.created_at);
      return (now.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    }) ?? [];

  const userPerfectScores: Record<string, number> = {};
  for (const qa of recentQuizAttempts) {
    if (qa.score === 100) {
      userPerfectScores[qa.user_id] = (userPerfectScores[qa.user_id] ?? 0) + 1;
    }
  }

  for (const [userId, perfectCount] of Object.entries(userPerfectScores)) {
    if (perfectCount >= 5) {
      const user = users?.find((u) => u.id === userId);
      const aiPrompt = `Student ${user?.full_name ?? "Unknown"} has achieved perfect scores on ${perfectCount} quizzes in the past week. This could indicate excellent performance or cheating. Analyze and recommend action in 2-3 sentences.`;

      let aiAnalysis = "Review quiz attempt patterns for irregularities.";
      try {
        aiAnalysis = await callAI(
          aiPrompt,
          "You are an academic integrity analyst. Provide balanced recommendations."
        );
      } catch {}

      anomalies.push({
        id: `suspicious_quiz_${userId}`,
        type: "suspicious_quiz",
        severity: "medium",
        title: "Unusual Quiz Performance Pattern",
        description: `${perfectCount} perfect quiz scores in one week`,
        affectedUsers: [userId],
        detectedAt: now.toISOString(),
        aiAnalysis,
        recommendedAction: "Review quiz timing and answer patterns. Consider oral verification.",
      });
    }
  }

  // 3. Detect engagement drop (students who were active but suddenly stopped)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const previouslyActive = new Set<string>();
  const recentlyActive = new Set<string>();

  for (const qa of quizAttempts ?? []) {
    const date = new Date(qa.created_at);
    if (date >= thirtyDaysAgo && date < sevenDaysAgo) {
      previouslyActive.add(qa.user_id);
    }
    if (date >= sevenDaysAgo) {
      recentlyActive.add(qa.user_id);
    }
  }

  const droppedEngagement = [...previouslyActive].filter((id) => !recentlyActive.has(id));

  if (droppedEngagement.length >= 3) {
    const affectedNames =
      users
        ?.filter((u) => droppedEngagement.includes(u.id))
        .map((u) => u.full_name ?? u.email)
        .join(", ") ?? "Multiple students";

    anomalies.push({
      id: "engagement_drop_batch",
      type: "engagement_drop",
      severity: "medium",
      title: "Sudden Engagement Drop Detected",
      description: `${droppedEngagement.length} previously active students have stopped engaging`,
      affectedUsers: droppedEngagement,
      detectedAt: now.toISOString(),
      aiAnalysis: `Students (${affectedNames}) were active 1-4 weeks ago but show no recent quiz or lesson activity. This pattern often precedes dropouts. Consider sending re-engagement messages or surveying the affected group to identify common issues.`,
      recommendedAction: "Send re-engagement notifications and survey affected students.",
    });
  }

  // 4. Detect enrollment spikes
  const recentEnrollments =
    enrollments?.filter((e) => {
      const date = new Date(e.enrolled_at);
      return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) <= 1;
    }) ?? [];

  if (recentEnrollments.length > 10) {
    anomalies.push({
      id: "enrollment_spike_today",
      type: "enrollment_spike",
      severity: "low",
      title: "Unusual Enrollment Activity",
      description: `${recentEnrollments.length} enrollments in the last 24 hours`,
      affectedUsers: recentEnrollments.map((e) => e.user_id),
      detectedAt: now.toISOString(),
      aiAnalysis: "A sudden increase in enrollments could indicate a successful marketing campaign, a new batch launch, or automated bot registrations. Verify the quality of new accounts.",
      recommendedAction: "Review new student applications for quality and authenticity.",
    });
  }

  // 5. Detect failed login pattern anomalies (potential brute force or account issues)
  const failedLogins = loginHistory?.filter((l) => l.status === "failed_credentials") ?? [];
  const failedByUser: Record<string, number> = {};
  for (const fl of failedLogins) {
    failedByUser[fl.user_id] = (failedByUser[fl.user_id] ?? 0) + 1;
  }

  for (const [userId, failCount] of Object.entries(failedByUser)) {
    if (failCount >= 3) {
      const user = users?.find((u) => u.id === userId);
      anomalies.push({
        id: `login_fail_${userId}`,
        type: "login_pattern",
        severity: "low",
        title: "Repeated Login Failures",
        description: `${failCount} failed login attempts for ${user?.email ?? "unknown"}`,
        affectedUsers: [userId],
        detectedAt: now.toISOString(),
        aiAnalysis: "Multiple failed login attempts may indicate a forgotten password, shared credentials, or unauthorized access attempt.",
        recommendedAction: "Contact the user to verify account security and offer password reset.",
      });
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return anomalies;
}

export interface EnrolledStudent {
  id: string;
  full_name: string | null;
  email: string;
  enrolled_at: string;
  progress: number | null;
  enrolled_by: string | null;
}

export async function getEnrolledStudents(
  courseId: string
): Promise<{ data: EnrolledStudent[]; error: string | null }> {
  await verifyAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: enrollments, error } = await admin
    .from("enrollments")
    .select("user_id, enrolled_at, progress, enrolled_by, users!enrollments_user_id_fkey(id, full_name, email)")
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  const enrolledStudents: EnrolledStudent[] = (enrollments ?? []).map((e: any) => {
    const user = Array.isArray(e.users) ? e.users[0] : e.users;
    return {
      id: e.user_id,
      full_name: user?.full_name ?? null,
      email: user?.email ?? "",
      enrolled_at: e.enrolled_at,
      progress: e.progress,
      enrolled_by: e.enrolled_by,
    };
  });

  return { data: enrolledStudents, error: null };
}

// ============================================================
// 6. CHAT-BASED ADMIN ASSISTANT
// ============================================================

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  data?: any;
}

export async function chatWithAdminAssistant(
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<ChatResponse> {
  await verifyAdmin();
  const supabase = await createClient();

  // Build system prompt with available data capabilities
  const systemPrompt = `You are an AI assistant for an LMS (Learning Management System) admin dashboard. You can help admins query and understand their platform data.

Available data in the system:
- Users (students, instructors, admins) with profiles, roles, enrollment status
- Courses with enrollments, progress, attendance
- Quiz attempts and scores per student
- Login history and device fingerprints
- Audit logs of admin actions
- Notifications and lesson comments

When the admin asks about data, describe what queries would be useful and provide general guidance. If they ask for specific numbers or patterns, explain how they can find that information in the dashboard.

Be concise, professional, and helpful. If you don't know something, suggest where the admin can find that information.`;

  // Build conversation context
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (conversationHistory) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: message });

  const response = await callAI(
    message,
    systemPrompt
  );

  return {
    response,
  };
}
