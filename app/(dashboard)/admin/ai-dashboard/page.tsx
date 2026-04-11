import { getCurrentUser } from "@/lib/dal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  AlertTriangle,
  FileText,
  Target,
  ShieldAlert,
  Bot,
  Sparkles,
} from "lucide-react";
import PredictiveAnalyticsPanel from "@/components/admin/ai-predictive-analytics";
import StudentRiskDetectionPanel from "@/components/admin/ai-student-risk-detection";
import AutomatedReportPanel from "@/components/admin/ai-automated-report";
import EnrollmentRecommendationsPanel from "@/components/admin/ai-enrollment-recommendations";
import AnomalyDetectionPanel from "@/components/admin/ai-anomaly-detection";
import AdminChatAssistant from "@/components/admin/ai-chat-assistant";

export default async function AIDashboardPage() {
  await getCurrentUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-brand-600" />
          AI Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered insights, predictions, and assistance for your LMS
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Predictive Analytics</CardTitle>
            <div className="rounded-lg p-2 bg-brand-50 dark:bg-brand-950">
              <BarChart3 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Enrollment trends, dropout predictions, and platform health scoring
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Student Risk Detection</CardTitle>
            <div className="rounded-lg p-2 bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ML-powered identification of at-risk students with AI recommendations
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Anomaly Detection</CardTitle>
            <div className="rounded-lg p-2 bg-destructive/10">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Detect device sharing, suspicious quiz patterns, and engagement drops
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Dashboard Tabs */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-6">
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Risk Detection</span>
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
          <PredictiveAnalyticsPanel />
        </TabsContent>

        {/* Student Risk Detection Tab */}
        <TabsContent value="risk">
          <StudentRiskDetectionPanel />
        </TabsContent>

        {/* Automated Reports Tab */}
        <TabsContent value="reports">
          <AutomatedReportPanel />
        </TabsContent>

        {/* Enrollment Recommendations Tab */}
        <TabsContent value="enrollments">
          <EnrollmentRecommendationsPanel />
        </TabsContent>

        {/* Anomaly Detection Tab */}
        <TabsContent value="anomalies">
          <AnomalyDetectionPanel />
        </TabsContent>

        {/* Chat Assistant Tab */}
        <TabsContent value="chat">
          <AdminChatAssistant />
        </TabsContent>
      </Tabs>
    </div>
  );
}
