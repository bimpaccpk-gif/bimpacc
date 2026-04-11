"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { detectAnomalies, type AnomalyReport } from "@/app/actions/ai-admin";
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Loader2,
  XCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Users,
  ClipboardCheck,
  Monitor,
  LogIn,
  TrendingUp,
} from "lucide-react";

const typeIcons: Record<AnomalyReport["type"], React.ReactNode> = {
  device_sharing: <Monitor className="h-5 w-5" />,
  suspicious_quiz: <ClipboardCheck className="h-5 w-5" />,
  engagement_drop: <Users className="h-5 w-5" />,
  login_pattern: <LogIn className="h-5 w-5" />,
  enrollment_spike: <TrendingUp className="h-5 w-5" />,
};

export default function AnomalyDetectionPanel() {
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await detectAnomalies();
      if (result && "error" in result) {
        setError((result as any).error);
      } else {
        setAnomalies(result as AnomalyReport[]);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to detect anomalies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const highCount = anomalies.filter((a) => a.severity === "high").length;
  const mediumCount = anomalies.filter((a) => a.severity === "medium").length;
  const lowCount = anomalies.filter((a) => a.severity === "low").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-sm text-muted-foreground">
            AI is scanning for unusual patterns...
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
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchAnomalies}>
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
            <ShieldAlert className="h-5 w-5 text-brand-600" />
            Anomaly Detection
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-powered detection of unusual patterns and potential security concerns
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnomalies} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          Scan for Anomalies
        </Button>
      </div>

      {/* Severity Summary */}
      {anomalies.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-destructive">{highCount}</p>
                  <p className="text-xs text-muted-foreground">High Severity</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold text-warning">{mediumCount}</p>
                  <p className="text-xs text-muted-foreground">Medium Severity</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-info/50 bg-info/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-info" />
                <div>
                  <p className="text-2xl font-bold text-info">{lowCount}</p>
                  <p className="text-xs text-muted-foreground">Low Severity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Anomaly List */}
      {anomalies.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <p className="mt-2 text-sm font-medium text-foreground">No anomalies detected</p>
            <p className="text-xs text-muted-foreground">
              Your platform activity patterns look normal
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {anomalies.map((anomaly) => (
            <Card
              key={anomaly.id}
              className={`overflow-hidden ${
                anomaly.severity === "high"
                  ? "border-destructive/50"
                  : anomaly.severity === "medium"
                    ? "border-warning/50"
                    : ""
              }`}
            >
              <CardContent className="pt-4">
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() =>
                    setExpandedAnomaly(expandedAnomaly === anomaly.id ? null : anomaly.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        anomaly.severity === "high"
                          ? "bg-destructive/10"
                          : anomaly.severity === "medium"
                            ? "bg-warning/10"
                            : "bg-info/10"
                      }`}
                    >
                      {typeIcons[anomaly.type]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{anomaly.title}</p>
                      <p className="text-xs text-muted-foreground">{anomaly.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        anomaly.severity === "high"
                          ? "destructive"
                          : anomaly.severity === "medium"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {anomaly.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {anomaly.affectedUsers.length} user{anomaly.affectedUsers.length !== 1 ? "s" : ""}
                    </span>
                    {expandedAnomaly === anomaly.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedAnomaly === anomaly.id && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* AI Analysis */}
                    <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-900 dark:bg-brand-950/50">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-brand-600 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-brand-700 dark:text-brand-400">
                            AI Analysis
                          </p>
                          <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
                            {anomaly.aiAnalysis}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recommended Action */}
                    <div>
                      <p className="text-sm font-medium text-foreground">Recommended Action</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {anomaly.recommendedAction}
                      </p>
                    </div>

                    {/* Affected Users */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">
                        Affected Users ({anomaly.affectedUsers.length})
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {anomaly.affectedUsers.slice(0, 10).map((userId, i) => (
                          <code key={i} className="block rounded bg-muted px-2 py-1 text-xs">
                            {userId}
                          </code>
                        ))}
                        {anomaly.affectedUsers.length > 10 && (
                          <p className="text-xs text-muted-foreground">
                            ...and {anomaly.affectedUsers.length - 10} more
                          </p>
                        )}
                      </div>
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
