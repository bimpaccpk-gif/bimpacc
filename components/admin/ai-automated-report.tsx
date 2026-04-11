"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateAutomatedReport, type GeneratedReport } from "@/app/actions/ai-admin";
import {
  FileText,
  Sparkles,
  Loader2,
  XCircle,
  Download,
  Calendar,
} from "lucide-react";

export default function AutomatedReportPanel() {
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateAutomatedReport(period);
      if (result && "error" in result) {
        setError((result as any).error);
      } else {
        setReport(result as GeneratedReport);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const content = `# ${report.title}\n**Period:** ${report.period}\n**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n\n${report.sections.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n")}`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lms-report-${period}-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-600" />
            Automated Report Generation
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-generated comprehensive reports on platform performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={period === "weekly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("weekly")}
              className="h-7 px-3 text-xs"
            >
              Weekly
            </Button>
            <Button
              variant={period === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("monthly")}
              className="h-7 px-3 text-xs"
            >
              Monthly
            </Button>
          </div>
          <Button onClick={generateReport} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Report
          </Button>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
              <p className="mt-3 text-sm text-muted-foreground">
                AI is compiling your {period} report...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-2 text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={generateReport}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {report && !loading && (
        <div className="space-y-4">
          {/* Report Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {report.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {report.period}
                    </span>
                    <span>
                      Generated: {new Date(report.generatedAt).toLocaleString()}
                    </span>
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={downloadReport}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Report Sections */}
          {report.sections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">{section.heading}</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                {section.content.split("\n").map((line, i) => {
                  if (!line.trim()) return null;
                  if (line.startsWith("- ")) {
                    return (
                      <li key={i} className="text-sm text-muted-foreground ml-4">
                        {line.substring(2)}
                      </li>
                    );
                  }
                  if (/^\d+\.\s/.test(line)) {
                    return (
                      <p key={i} className="text-sm font-medium text-foreground">
                        {line}
                      </p>
                    );
                  }
                  return (
                    <p key={i} className="text-sm text-muted-foreground">
                      {line}
                    </p>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!report && !loading && !error && (
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">No report generated yet</p>
            <p className="text-xs text-muted-foreground">
              Click &quot;Generate Report&quot; to create an AI-powered {period} report
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
