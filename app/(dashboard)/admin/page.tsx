import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  BookOpen,
  Activity,
  UserPlus,
  Sparkles,
  BarChart3,
  AlertTriangle,
  FileText,
  Target,
  ShieldAlert,
  Bot,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import PredictiveAnalyticsPanel from "@/components/admin/ai-predictive-analytics";
import StudentRiskDetectionPanel from "@/components/admin/ai-student-risk-detection";
import AutomatedReportPanel from "@/components/admin/ai-automated-report";
import EnrollmentRecommendationsPanel from "@/components/admin/ai-enrollment-recommendations";
import AnomalyDetectionPanel from "@/components/admin/ai-anomaly-detection";
import AdminChatAssistant from "@/components/admin/ai-chat-assistant";

export default async function AdminDashboardPage() {
  await getCurrentUser();

  const supabase = await createClient();

  const [usersCount, coursesCount, enrollmentsCount, recentUsers] =
    await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      supabase.from("enrollments").select("*", { count: "exact", head: true }),
      supabase
        .from("users")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const totalUsers = usersCount.count ?? 0;
  const publishedCourses = coursesCount.count ?? 0;
  const totalEnrollments = enrollmentsCount.count ?? 0;
  const recentUsersList = recentUsers.data ?? [];

  const stats = [
    {
      title: "Total Users",
      value: totalUsers.toLocaleString(),
      icon: Users,
      bgColor: "bg-brand-50 dark:bg-brand-950",
      iconColor: "text-brand-600 dark:text-brand-400",
    },
    {
      title: "Published Courses",
      value: publishedCourses.toLocaleString(),
      icon: BookOpen,
      bgColor: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "Enrollments",
      value: totalEnrollments.toLocaleString(),
      icon: Activity,
      bgColor: "bg-info/10",
      iconColor: "text-info",
    },
    {
      title: "Recent Users",
      value: recentUsersList.length.toLocaleString(),
      icon: UserPlus,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your learning management system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Users & Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsersList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No users registered yet.
                </p>
              ) : (
                recentUsersList.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className="rounded-lg p-1.5 bg-brand-50 dark:bg-brand-950">
                      <UserPlus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {user.full_name || user.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email} &middot; {user.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Link
                href="/admin/users"
                className="rounded-lg border px-4 py-2.5 text-left text-sm font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:bg-brand-50/50 dark:hover:bg-brand-950/50"
              >
                Manage Users
              </Link>
              <Link
                href="/admin/courses"
                className="rounded-lg border px-4 py-2.5 text-left text-sm font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:bg-brand-50/50 dark:hover:bg-brand-950/50"
              >
                Review Courses
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Features Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-foreground">AI Features</h2>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-6">
            <TabsTrigger value="analytics" className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Risk</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Enrollments</span>
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Anomalies</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
          </TabsList>

          {/* Predictive Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-600" />
                  AI Predictive Analytics
                </CardTitle>
                <CardDescription>
                  Machine learning insights, platform health scoring, and enrollment forecasts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PredictiveAnalyticsPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student Risk Detection Tab */}
          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Student Risk Detection
                </CardTitle>
                <CardDescription>
                  ML-powered identification of students at risk of dropping out
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentRiskDetectionPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automated Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-600" />
                  Automated Report Generation
                </CardTitle>
                <CardDescription>
                  AI-generated comprehensive reports on platform performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AutomatedReportPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enrollment Recommendations Tab */}
          <TabsContent value="enrollments">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-brand-600" />
                  Smart Enrollment Recommendations
                </CardTitle>
                <CardDescription>
                  AI-powered course suggestions based on student profiles and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnrollmentRecommendationsPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomaly Detection Tab */}
          <TabsContent value="anomalies">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Anomaly Detection
                </CardTitle>
                <CardDescription>
                  AI detection of unusual patterns and potential security concerns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnomalyDetectionPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Assistant Tab */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-5 w-5 text-brand-600" />
                  AI Admin Assistant
                </CardTitle>
                <CardDescription>
                  Ask questions about your LMS data in natural language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminChatAssistant />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
