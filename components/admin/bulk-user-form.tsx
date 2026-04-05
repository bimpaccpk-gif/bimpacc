"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { adminBulkCreateUsers } from "@/lib/supabase/actions";

interface BulkUserFormProps {
  onSuccess: () => void;
  courses: any[];
}

export function BulkUserForm({ onSuccess, courses }: BulkUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [defaultRole, setDefaultRole] = useState("student");
  const [defaultCourseId, setDefaultCourseId] = useState("");
  const [bypassOnboarding, setBypassOnboarding] = useState(false);
  const [results, setResults] = useState<{ success: string[]; failed: string[] }>({
    success: [],
    failed: [],
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResults({ success: [], failed: [] });

    if (!csvText.trim()) {
      setError("Please provide user data via CSV file or text input");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("csvContent", csvText);
      formData.append("role", defaultRole);
      formData.append("courseId", defaultCourseId);
      formData.append(
        "bypassOnboarding",
        bypassOnboarding && defaultRole === "student" ? "true" : "false"
      );

      const result = await adminBulkCreateUsers(undefined, formData);

      if (result.error) {
        setError(result.error);
      }

      if (result.results) {
        const successList: string[] = [];
        const failedList: string[] = [];

        for (const item of result.results) {
          if (item.success) {
            successList.push(item.email);
          } else {
            failedList.push(`${item.email}: ${item.error}`);
          }
        }

        setResults({ success: successList, failed: failedList });

        if (failedList.length === 0) {
          setSuccess(
            `Successfully created ${successList.length} user(s). Temporary password for all users: TempPass123!`
          );
          setTimeout(() => {
            onSuccess();
          }, 2000);
        } else if (successList.length > 0) {
          setSuccess(
            `Created ${successList.length} user(s), ${failedList.length} failed. Temporary password for all users: TempPass123!`
          );
        } else {
          setError(`Failed to create all ${failedList.length} user(s)`);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="csvFile">Upload CSV File</Label>
        <div className="flex items-center gap-2">
          <Input
            id="csvFile"
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="flex-1"
          />
          <Upload className="text-muted-foreground h-4 w-4" />
        </div>
        <p className="text-muted-foreground text-xs">
          CSV format: email, fullName, role (optional), courseId (optional)
        </p>
        <a
          href="/sample-bulk-users.csv"
          download
          className="text-xs text-primary underline hover:text-primary/80"
        >
          Download sample CSV file
        </a>
      </div>

      <div className="space-y-2">
        <Label htmlFor="csvText">Or Paste User Data</Label>
        <Textarea
          id="csvText"
          placeholder={`john@gmail.com, John Doe, student, course-id\njane@gmail.com, Jane Smith, instructor`}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
        <p className="text-muted-foreground text-xs">
          One user per line: email, fullName, role (optional), courseId (optional)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="defaultRole">Default Role</Label>
          <select
            id="defaultRole"
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultCourse">Default Course (for students)</Label>
          <select
            id="defaultCourse"
            value={defaultCourseId}
            onChange={(e) => setDefaultCourseId(e.target.value)}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">No course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bypass Onboarding (for students only) */}
      {defaultRole === "student" && (
        <div className="rounded-xl border border-info/30 bg-info/5 p-4 shadow-sm dark:border-info/20 dark:bg-info/10">
          <label className="group flex cursor-pointer items-start gap-3">
            <div className="relative mt-0.5 flex items-center">
              <input
                type="checkbox"
                checked={bypassOnboarding}
                onChange={(e) => setBypassOnboarding(e.target.checked)}
                className="peer border-input bg-background h-4 w-4 shrink-0 cursor-pointer rounded border accent-primary"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-info dark:text-info">
                <ShieldCheck className="h-4 w-4" />
                Bypass Onboarding
              </div>
              <p className="text-xs leading-relaxed text-info/70 dark:text-info/70">
                Skip the onboarding process for all created students. They will be able to access
                the platform directly without completing onboarding forms.
              </p>
            </div>
          </label>
        </div>
      )}

      {(results.success.length > 0 || results.failed.length > 0) && (
        <div className="space-y-2 rounded-lg border p-4">
          <h4 className="font-medium">Results:</h4>
          {results.success.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-success">✓ Successfully created:</p>
              <ul className="text-muted-foreground ml-4 list-disc text-xs">
                {results.success.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            </div>
          )}
          {results.failed.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">✗ Failed:</p>
              <ul className="text-muted-foreground ml-4 list-disc text-xs">
                {results.failed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <FileText className="mr-2 h-4 w-4" />
          Create Users
        </Button>
      </div>
    </form>
  );
}
