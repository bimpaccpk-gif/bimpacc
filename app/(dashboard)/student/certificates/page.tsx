import { getCurrentUser } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CertificateViewer, type CertificateData } from "@/components/student/certificate-viewer";
import { Award, Calendar, BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CertificateRow {
  id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  course_title: string;
  course_batch: string | null;
}

async function getCertificates(userId: string): Promise<CertificateRow[]> {
  const admin = createAdminClient();

  const { data: certs, error } = await admin
    .from("certificates")
    .select("*")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });

  if (error || !certs || certs.length === 0) return [];

  const courseIds = certs.map((c) => c.course_id);
  const { data: courses } = await admin
    .from("courses")
    .select("id, title, batch")
    .in("id", courseIds);

  const courseMap = new Map<string, { id: string; title: string; batch: string | null }>();
  (courses ?? []).forEach((c) => courseMap.set(c.id, c));

  return certs.map((c) => ({
    id: c.id,
    course_id: c.course_id,
    certificate_number: c.certificate_number,
    issued_at: c.issued_at,
    course_title: courseMap.get(c.course_id)?.title ?? "Unknown Course",
    course_batch: courseMap.get(c.course_id)?.batch ?? null,
  }));
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function CertificatesPage() {
  const user = await getCurrentUser();
  const certificates = await getCertificates(user.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back nav */}
      <Link
        href="/student"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 dark:bg-amber-900/30 flex h-10 w-10 items-center justify-center rounded-xl">
          <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Certificates</h1>
          <p className="text-muted-foreground text-sm">
            Certificates for courses you have completed
          </p>
        </div>
      </div>

      {/* Certificates */}
      {certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16 text-center">
          <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Award className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-semibold">No certificates yet</h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Complete all lessons in a course to earn your certificate
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {certificates.map((cert) => (
            <div key={cert.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{cert.course_title}</h3>
                {cert.course_batch && (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <BookOpen className="h-3 w-3" />
                    Batch {cert.course_batch}
                  </span>
                )}
              </div>

              <CertificateViewer
                certificate={{
                  course_title: cert.course_title,
                  user_name: user.full_name,
                  issued_at: cert.issued_at,
                  certificate_number: cert.certificate_number,
                }}
              />

              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Calendar className="h-3 w-3" />
                Issued {formatDate(cert.issued_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
