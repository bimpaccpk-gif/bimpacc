"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEnrollmentRecommendations, type EnrollmentRecommendation } from "@/app/actions/ai-admin";
import {
  Sparkles,
  Loader2,
  XCircle,
  BookOpen,
  UserPlus,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function EnrollmentRecommendationsPanel() {
  const [recommendations, setRecommendations] = useState<EnrollmentRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEnrollmentRecommendations();
      if (result && "error" in result) {
        setError((result as any).error);
      } else {
        setRecommendations(result as EnrollmentRecommendation[]);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-sm text-muted-foreground">
            AI is analyzing student profiles and matching courses...
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
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchRecommendations}>
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
            <Target className="h-5 w-5 text-brand-600" />
            Smart Enrollment Recommendations
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-powered course suggestions based on student profiles and performance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRecommendations} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          Refresh AI Recommendations
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">No recommendations available</p>
            <p className="text-xs text-muted-foreground">
              All students may already be enrolled in available courses
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <Card key={rec.userId} className="overflow-hidden">
              <CardContent className="pt-4">
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() => setExpandedUser(expandedUser === rec.userId ? null : rec.userId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-brand-50 p-2 dark:bg-brand-950">
                      <UserPlus className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{rec.userName}</p>
                      <p className="text-xs text-muted-foreground">{rec.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {rec.recommendedCourses.length} course{rec.recommendedCourses.length !== 1 ? "s" : ""} recommended
                      </p>
                      {rec.educationLevel && (
                        <Badge variant="outline" className="text-xs">
                          {rec.educationLevel}
                        </Badge>
                      )}
                    </div>
                    {expandedUser === rec.userId ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedUser === rec.userId && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {rec.currentCourses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Current Courses</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.currentCourses.map((course, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {course}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Recommended Courses
                      </p>
                      <div className="space-y-2">
                        {rec.recommendedCourses.map((course, i) => (
                          <div
                            key={i}
                            className="flex items-start justify-between rounded-lg border p-3"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-brand-600" />
                                <p className="text-sm font-medium">{course.courseTitle}</p>
                                {course.batch && (
                                  <Badge variant="outline" className="text-xs">
                                    {course.batch}
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{course.reason}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Match</p>
                                <p className={`text-lg font-bold ${
                                  course.matchScore >= 80 ? "text-success" :
                                  course.matchScore >= 60 ? "text-warning" : "text-muted-foreground"
                                }`}>
                                  {course.matchScore}%
                                </p>
                              </div>
                              <Button size="sm" variant="outline">
                                <UserPlus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
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
