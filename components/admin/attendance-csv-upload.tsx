"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { importAttendanceCSV } from "@/app/actions/attendance";
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AttendanceCSVUploadProps {
  courseId: string;
}

export function AttendanceCSVUpload({ courseId }: AttendanceCSVUploadProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [sessionDate, setSessionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [sessionDuration, setSessionDuration] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    presentCount?: number;
    absentCount?: number;
    unmatched?: { name: string; email: string }[];
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!sessionDate) {
      toast.error("Please select a session date");
      return;
    }
    const duration = parseFloat(sessionDuration);
    if (!duration || duration <= 0) {
      toast.error("Please enter a valid session duration");
      return;
    }
    if (!csvText.trim()) {
      toast.error("Please upload a CSV or paste its contents");
      return;
    }

    setLoading(true);
    setResult(null);

    // Parse CSV to get row count for progress display
    const lines = csvText.trim().split("\n").filter((l) => l.trim());
    void lines; // available for future progress display

    const res = await importAttendanceCSV(courseId, sessionDate, duration, csvText);
    setLoading(false);
    setResult(res);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(
        `Attendance marked: ${res.presentCount} present, ${res.absentCount} absent${
          res.unmatched?.length ? `, ${res.unmatched.length} unmatched` : ""
        }`
      );
      router.refresh();
    }
  };

  const resetForm = () => {
    setCsvText("");
    setSessionDuration("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    const today = new Date();
    setSessionDate(today.toISOString().split("T")[0]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger>
        <Button size="sm" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          New Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Import Attendance from CSV
          </DialogTitle>
          <DialogDescription className="text-center">
            Upload Zoom meeting attendance report. Students with watch time ≥ 80% of
            session duration will be marked present.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Session Date */}
          <div className="space-y-2">
            <Label htmlFor="sessionDate">Session Date</Label>
            <Input
              id="sessionDate"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Session Duration */}
          <div className="space-y-2">
            <Label htmlFor="sessionDuration">
              Session Duration (minutes)
            </Label>
            <Input
              id="sessionDuration"
              type="number"
              min="1"
              placeholder="e.g., 90"
              value={sessionDuration}
              onChange={(e) => setSessionDuration(e.target.value)}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              80% threshold = {sessionDuration ? `${Math.round(parseFloat(sessionDuration) * 0.8)} min` : "—"}
            </p>
          </div>

          {/* CSV Upload */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <div className="flex items-center gap-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="h-10"
              />
            </div>
          </div>

          {/* Or paste CSV */}
          <div className="space-y-2">
            <Label htmlFor="csvText">
              Or paste CSV content
              <span className="ml-1 text-muted-foreground">(header: Name, Email, Duration)</span>
            </Label>
            <Textarea
              id="csvText"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Name,Email,Duration (Minutes)\nJohn Doe,john@gmail.com,75\nJane Smith,jane@gmail.com,30`}
              className="min-h-[120px] font-mono text-xs"
            />
          </div>

          {/* Result */}
          {result && !result.error && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">
                  {result.presentCount} present, {result.absentCount} absent
                </span>
                {result.unmatched && result.unmatched.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm">
                      Unmatched ({result.unmatched.length}):
                    </p>
                    <ul className="mt-1 text-xs space-y-0.5 max-h-24 overflow-y-auto">
                      {result.unmatched.map((u, i) => (
                        <li key={i}>
                          • {u.name} ({u.email})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {result?.error && (
            <Alert variant="destructive" className="animate-shake">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="mt-4">
          <DialogClose>
            <Button variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Attendance
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
