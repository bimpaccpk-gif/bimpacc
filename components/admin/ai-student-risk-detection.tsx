"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAtRiskStudents, type AtRiskStudent } from "@/app/actions/ai-admin";
import {
  AlertTriangle,
  ShieldAlert,
  Shield,
  Sparkles,
  Loader2,
  XCircle,
  Mail,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function StudentRiskDetectionPanel() {
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const fetchAtRiskStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAtRiskStudents();
      if (result && "error" in result) {
        setError((result as any).error);
      } else {
        setStudents(result as AtRiskStudent[]);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load risk data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtRiskStudents();
  }, []);

  const highRiskCount = students.filter((s) => s.riskLevel === "high").length;
  const mediumRiskCount = students.filter((s) => s.riskLevel === "medium").length;
  const lowRiskCount = students.filter((s) => s.riskLevel === "low").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-sm text-muted-foreground">
            AI is analyzing student risk factors...
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
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchAtRiskStudents}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Student Risk Detection
          </h2>
          <p className="text-sm text-muted-foreground">
            ML-powered identification of students at risk of dropping out
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAtRiskStudents} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          Refresh AI Analysis
        </Button>
      </div>

      {/* Risk Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{highRiskCount}</p>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{mediumRiskCount}</p>
                <p className="text-xs text-muted-foreground">Medium Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-info/50 bg-info/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold text-info">{lowRiskCount}</p>
                <p className="text-xs text-muted-foreground">Low Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <UserCheck className="mx-auto h-10 w-10 text-success" />
            <p className="mt-2 text-sm font-medium text-foreground">No at-risk students detected</p>
            <p className="text-xs text-muted-foreground">
              All students appear to be engaged and progressing well
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <Card key={student.id} className="overflow-hidden">
              <CardContent className="pt-4">
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${
                      student.riskLevel === "high" ? "bg-destructive/10" :
                      student.riskLevel === "medium" ? "bg-warning/10" : "bg-info/10"
                    }`}>
                      {student.riskLevel === "high" ? (
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                      ) : student.riskLevel === "medium" ? (
                        <Shield className="h-5 w-5 text-warning" />
                      ) : (
                        <UserCheck className="h-5 w-5 text-info" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Risk Score: <span className={`font-bold ${
                          student.riskLevel === "high" ? "text-destructive" :
                          student.riskLevel === "medium" ? "text-warning" : "text-info"
                        }`}>{student.riskScore}/100</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{student.courseTitle}</p>
                    </div>
                    <Badge variant={
                      student.riskLevel === "high" ? "destructive" :
                      student.riskLevel === "medium" ? "default" : "secondary"
                    }>
                      {student.riskLevel}
                    </Badge>
                    {expandedStudent === student.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedStudent === student.id && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Metrics */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="text-lg font-bold">{student.progressPercent}%</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground">Attendance</p>
                        <p className="text-lg font-bold">{student.attendancePercent}%</p>
                      </div>
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground">Quiz Pass Rate</p>
                        <p className="text-lg font-bold">{student.quizPassRate}%</p>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    <div>
                      <p className="text-sm font-medium text-foreground">Risk Factors</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {student.factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-900 dark:bg-brand-950/50">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-brand-600 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-brand-700 dark:text-brand-400">
                            AI Recommendation
                          </p>
                          <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
                            {student.aiRecommendation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Mail className="mr-1.5 h-3.5 w-3.5" />
                        Send Email
                      </Button>
                      <Button size="sm" variant="outline">
                        <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                        Assign Mentor
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
