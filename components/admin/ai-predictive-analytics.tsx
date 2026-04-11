"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPredictiveAnalytics, type PredictiveAnalytics } from "@/app/actions/ai-admin";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
} from "lucide-react";

export default function PredictiveAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<PredictiveAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPredictiveAnalytics();
      if (result && "error" in result) {
        setError((result as any).error);
      } else {
        setAnalytics(result as PredictiveAnalytics);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-sm text-muted-foreground">
            AI is analyzing your platform data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchAnalytics}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const TrendIcon = analytics.enrollmentTrend.trend === "up" ? TrendingUp : analytics.enrollmentTrend.trend === "down" ? TrendingDown : Minus;
  const trendColor = analytics.enrollmentTrend.trend === "up" ? "text-success" : analytics.enrollmentTrend.trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">AI Predictive Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Machine learning insights and platform health scoring
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          Refresh AI Analysis
        </Button>
      </div>

      {/* Platform Health Score */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-600" />
            Platform Health Score
          </CardTitle>
          <CardDescription>AI-assessed overall platform health and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-brand-600">
              <span className="text-2xl font-bold text-brand-600">{analytics.overallHealth.score}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{analytics.overallHealth.summary}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Strengths
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {analytics.overallHealth.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Areas to Improve
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {analytics.overallHealth.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Enrollment Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Enrollment Trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{analytics.enrollmentTrend.value}</span>
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
            </div>
            <p className="text-xs text-muted-foreground">{analytics.enrollmentTrend.prediction}</p>
          </CardContent>
        </Card>

        {/* Dropout Risk */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Dropout Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-warning">{analytics.dropoutRisk.atRiskCount}</span>
              <span className="text-sm text-muted-foreground">/ {analytics.dropoutRisk.totalStudents} students</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-warning"
                style={{ width: `${analytics.dropoutRisk.atRiskPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{analytics.dropoutRisk.atRiskPercentage.toFixed(0)}% at risk</p>
          </CardContent>
        </Card>

        {/* Revenue Projection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Enrollment Projection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Current (30d)</p>
                <p className="text-2xl font-bold">{analytics.revenueProjection.currentMonth}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-success" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Projected (30d)</p>
                <p className="text-2xl font-bold text-success">{analytics.revenueProjection.projectedNextMonth}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{analytics.revenueProjection.insights}</p>
          </CardContent>
        </Card>
      </div>

      {/* Course Popularity */}
      {analytics.coursePopularity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course Popularity Forecast</CardTitle>
            <CardDescription>AI-predicted enrollment trends per course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.coursePopularity.map((course) => (
                <div key={course.courseId} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{course.courseTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {course.currentEnrollments} → Predicted: {course.predictedEnrollments}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {course.trend === "rising" && <TrendingUp className="h-4 w-4 text-success" />}
                    {course.trend === "declining" && <TrendingDown className="h-4 w-4 text-destructive" />}
                    {course.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-xs font-medium ${
                      course.trend === "rising" ? "text-success" : course.trend === "declining" ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {course.trend.charAt(0).toUpperCase() + course.trend.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
