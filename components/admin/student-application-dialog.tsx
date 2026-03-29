"use client";

import { useState, useEffect, useActionState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toggleStudentApproval, adminBypassOnboarding } from "@/lib/supabase/actions";
import {
  getStudentApplication,
  updateStudentProfile,
  type StudentApplication,
} from "@/app/actions/admin";
import {
  Eye,
  Loader2,
  User,
  GraduationCap,
  Phone,
  CreditCard,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  Briefcase,
  ImageIcon,
  Pencil,
  Save,
  Shield,
  Clock,
  Mail,
  CheckSquare,
  BookOpen,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(url);
}

function DocumentViewer({
  url,
  label,
}: {
  url: string | null;
  label: string;
}) {
  if (!url) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{label}: Not uploaded</span>
      </div>
    );
  }

  if (isImageUrl(url)) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="group relative overflow-hidden rounded-xl border border-border bg-muted/20">
          <img
            src={url}
            alt={label}
            className="w-full max-h-64 object-contain bg-white dark:bg-zinc-900"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
          >
            <Download className="h-3 w-3" />
            Open Full Size
          </a>
        </div>
      </div>
    );
  }

  // PDF or other file
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
      >
        <FileText className="h-5 w-5 text-indigo-500" />
        <span className="flex-1">View / Download {label}</span>
        <Download className="h-4 w-4 text-muted-foreground" />
      </a>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function EditableField({
  label,
  name,
  value,
  type = "text",
  editing,
}: {
  label: string;
  name: string;
  value: string | null | undefined;
  type?: string;
  editing: boolean;
}) {
  if (!editing) return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        className="h-9 text-sm"
      />
    </div>
  );
}

// ─── Section Component ─────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Icon className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ─── Main Dialog Component ─────────────────────────────────

export function StudentApplicationDialog({
  userId,
  studentName,
  isApproved,
}: {
  userId: string;
  studentName: string;
  isApproved: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [app, setApp] = useState<StudentApplication | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [editing, setEditing] = useState(false);

  const [approvalState, approvalAction, approvalPending] = useActionState(
    toggleStudentApproval,
    undefined
  );

  const [editState, editAction, editPending] = useActionState(
    updateStudentProfile,
    undefined
  );

  const [bypassState, bypassAction, bypassPending] = useActionState(
    adminBypassOnboarding,
    undefined
  );

  // Re-sync local approval state after action
  useEffect(() => {
    if (approvalState?.success && app) {
      setApp({ ...app, is_approved: !app.is_approved });
    }
  }, [approvalState]);

  // Re-sync local bypass state after action
  useEffect(() => {
    if (bypassState?.success && app) {
      setApp({ ...app, onboarding_bypassed: !app.onboarding_bypassed });
    }
  }, [bypassState]);

  // Re-sync after edit save
  useEffect(() => {
    if (editState?.success && app) {
      setEditing(false);
      // Re-fetch to get updated data
      setLoading(true);
      getStudentApplication(userId).then((result) => {
        if (result.data) setApp(result.data);
        setLoading(false);
      });
    }
  }, [editState]);

  // Fetch application data when dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setFetchError("");
    setEditing(false);

    getStudentApplication(userId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setFetchError(result.error);
      } else {
        setApp(result.data);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition-colors hover:bg-indigo-500/20"
      >
        <Eye className="h-3 w-3" />
        Review
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Application</DialogTitle>
          <DialogDescription>
            Full profile for{" "}
            <span className="font-semibold text-foreground">{studentName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-muted-foreground">
              Loading application...
            </p>
          </div>
        )}

        {/* Error State */}
        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-6 text-center">
            <XCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {fetchError}
            </p>
          </div>
        )}

        {/* Application Data */}
        {app && !loading && (
          <div className="space-y-8 pt-2">
            {/* Status Bar */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Status
                </span>
                {app.is_approved ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                    <Loader2 className="h-3 w-3" />
                    Under Review
                  </span>
                )}
                {app.onboarding_bypassed && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                    <ShieldCheck className="h-3 w-3" />
                    Onboarding Bypassed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!app.onboarding_completed && (
                  <form action={bypassAction}>
                    <input type="hidden" name="userId" value={userId} />
                    <input
                      type="hidden"
                      name="bypass"
                      value={app.onboarding_bypassed ? "false" : "true"}
                    />
                    <Button
                      type="submit"
                      variant={app.onboarding_bypassed ? "destructive" : "outline"}
                      size="sm"
                      disabled={bypassPending}
                      className="h-8 text-xs gap-1.5"
                    >
                      {bypassPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : app.onboarding_bypassed ? (
                        <>
                          <ShieldOff className="h-3 w-3" />
                          Restore Onboarding
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3 w-3" />
                          Bypass Onboarding
                        </>
                      )}
                    </Button>
                  </form>
                )}
                {!editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit Details
                  </Button>
                )}
              </div>
            </div>

            {/* Student Photo */}
            {app.avatar_file_url && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={app.avatar_file_url}
                    alt="Student Photo"
                    className="h-28 w-28 rounded-2xl object-cover border-2 border-border shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5 shadow">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* Wrap editable sections in a form */}
            {editing ? (
              <form action={editAction} className="space-y-8">
                <input type="hidden" name="userId" value={userId} />

                {/* Section: Account Info */}
                <Section icon={Shield} title="Account Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditableField label="Full Name" name="full_name" value={app.full_name} editing={true} />
                    <EditableField label="Email" name="email" value={app.email} type="email" editing={true} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <InfoRow icon={Shield} label="Role" value={app.role} />
                    <InfoRow icon={Clock} label="Joined" value={formatDateTime(app.created_at)} />
                  </div>
                </Section>

                {/* Section 1: Personal Info */}
                <Section icon={User} title="Personal Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditableField label="Father's Name" name="father_name" value={app.father_name} editing={true} />
                    <EditableField label="CNIC / Passport Number" name="cnic_number" value={app.cnic_number} editing={true} />
                    <EditableField label="Date of Birth" name="dob" value={app.dob} type="date" editing={true} />
                  </div>
                  <DocumentViewer url={app.cnic_url} label="CNIC / Passport" />
                </Section>

                {/* Section 2: Academic Background */}
                <Section icon={GraduationCap} title="Academic Background">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditableField label="Education Level" name="education_level" value={app.education_level} editing={true} />
                    <EditableField label="Degree Title" name="degree_title" value={app.degree_title} editing={true} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <EditableField label="Profession" name="profession" value={app.profession} editing={true} />
                  </div>
                  <DocumentViewer url={app.degree_url} label="Degree / Certificate" />
                </Section>

                {/* Section 3: Contact Details */}
                <Section icon={Phone} title="Contact Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditableField label="WhatsApp Number" name="whatsapp_number" value={app.whatsapp_number} editing={true} />
                    <EditableField label="Postal Address" name="postal_address" value={app.postal_address} editing={true} />
                  </div>
                </Section>

                {/* Section 4: Fee Verification */}
                <Section icon={CreditCard} title="Fee Verification">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditableField label="Transaction ID" name="fee_transaction_id" value={app.fee_transaction_id} editing={true} />
                    <EditableField label="Payment Date" name="fee_submission_date" value={app.fee_submission_date} type="date" editing={true} />
                    <EditableField label="Bank Name" name="bank_name" value={app.bank_name} editing={true} />
                  </div>
                  <DocumentViewer url={app.fee_receipt_url} label="Fee Receipt / Screenshot" />
                </Section>

                {/* Edit feedback */}
                {editState?.error && (
                  <p className="text-sm text-red-500 text-center">{editState.error}</p>
                )}
                {editState?.success && (
                  <p className="text-sm text-emerald-500 text-center">{editState.success}</p>
                )}

                {/* Edit Actions */}
                <div className="flex gap-3 border-t border-border pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditing(false)}
                    disabled={editPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700"
                    disabled={editPending}
                  >
                    {editPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              /* ─── Read-Only View ─── */
              <div className="space-y-8">
                {/* Section: Account Info */}
                <Section icon={Shield} title="Account Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={User} label="Full Name" value={app.full_name} />
                    <InfoRow icon={Mail} label="Email" value={app.email} />
                    <InfoRow icon={Shield} label="Role" value={app.role} />
                    <InfoRow icon={CheckSquare} label="Onboarding" value={app.onboarding_completed ? "Completed" : app.onboarding_bypassed ? "Bypassed" : "Pending"} />
                    <InfoRow icon={Clock} label="Joined" value={formatDateTime(app.created_at)} />
                    <InfoRow icon={Clock} label="Last Updated" value={formatDateTime(app.updated_at)} />
                  </div>
                </Section>

                {/* Section 1: Personal Info */}
                <Section icon={User} title="Personal Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={User} label="Full Name" value={app.full_name} />
                    <InfoRow icon={User} label="Father's Name" value={app.father_name} />
                    <InfoRow icon={CreditCard} label="CNIC / Passport Number" value={app.cnic_number} />
                    <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(app.dob)} />
                    <InfoRow icon={Mail} label="Email" value={app.email} />
                  </div>
                  <DocumentViewer url={app.cnic_url} label="CNIC / Passport" />
                </Section>

                {/* Section 2: Academic Background */}
                <Section icon={GraduationCap} title="Academic Background">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={GraduationCap} label="Education Level" value={app.education_level} />
                    <InfoRow icon={GraduationCap} label="Degree Title" value={app.degree_title} />
                    <InfoRow icon={Briefcase} label="Profession" value={app.profession} />
                  </div>
                  <DocumentViewer url={app.degree_url} label="Degree / Certificate" />
                </Section>

                {/* Section 3: Contact Details */}
                <Section icon={Phone} title="Contact Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={Phone} label="WhatsApp Number" value={app.whatsapp_number} />
                    <InfoRow icon={MapPin} label="Postal Address" value={app.postal_address} />
                  </div>
                </Section>

                {/* Section 4: Fee Verification */}
                <Section icon={CreditCard} title="Fee Verification">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={CreditCard} label="Transaction ID" value={app.fee_transaction_id} />
                    <InfoRow icon={Calendar} label="Payment Date" value={formatDate(app.fee_submission_date)} />
                    <InfoRow icon={CreditCard} label="Bank Name" value={app.bank_name} />
                  </div>
                  <DocumentViewer url={app.fee_receipt_url} label="Fee Receipt / Screenshot" />
                </Section>

                {/* Section 5: Enrollment Request */}
                {app.selected_course_id && (
                  <Section icon={BookOpen} title="Enrollment Request">
                    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
                          <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{app.selected_course_title || "Course"}</p>
                          {app.selected_course_batch && (
                            <p className="text-sm text-muted-foreground">Batch: {app.selected_course_batch}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Section>
                )}

                {/* Section 5: Declaration */}
                <Section icon={CheckSquare} title="Declaration">
                  <div className="grid grid-cols-1 gap-4">
                    <InfoRow
                      icon={CheckSquare}
                      label="Declaration Accepted"
                      value={app.declaration_accepted ? "Yes — Student accepted the declaration" : "No"}
                    />
                  </div>
                </Section>

                {/* Approval Action */}
                <div className="border-t border-border pt-6">
                  {approvalState?.error && (
                    <p className="mb-3 text-sm text-red-500 text-center">
                      {approvalState.error}
                    </p>
                  )}
                  {approvalState?.success && (
                    <p className="mb-3 text-sm text-emerald-500 text-center">
                      {approvalState.success}
                    </p>
                  )}

                  <form action={approvalAction}>
                    <input type="hidden" name="userId" value={userId} />
                    <input
                      type="hidden"
                      name="isApproved"
                      value={(!app.is_approved).toString()}
                    />

                    {app.is_approved ? (
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={approvalPending}
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        {approvalPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Revoke Approval
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={approvalPending}
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg"
                      >
                        {approvalPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Approve Student
                      </Button>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
