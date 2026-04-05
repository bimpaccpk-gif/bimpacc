"use client"

import { useState } from "react"
import { Award, Copy, Check, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CertificateData {
  course_title: string
  user_name: string
  issued_at: string
  certificate_number: string
}

export interface CertificateViewerProps {
  certificate: CertificateData | null
}

/**
 * Certificate viewer / placeholder component.
 * Renders a styled certificate card when a certificate exists,
 * or a "complete all lessons" prompt when null.
 */
export function CertificateViewer({ certificate }: CertificateViewerProps) {
  const [copied, setCopied] = useState(false)

  if (!certificate) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/50 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Award className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium">No certificate available yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Complete all lessons to earn your certificate
        </p>
      </div>
    )
  }

  async function copyCertificateNumber() {
    if (!certificate) return
    try {
      await navigator.clipboard.writeText(certificate.certificate_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — do nothing
    }
  }

  const issuedDate = new Date(certificate.issued_at).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      {/* Decorative top border gradient */}
      <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

      <div className="p-6 sm:p-8">
        {/* Certificate body with decorative border pattern */}
        <div className="relative rounded-lg border-2 border-double border-border/40 p-6 sm:p-10 text-center">
          {/* Corner ornaments using pseudo-elements — implemented with absolute divs */}
          <div className="absolute left-3 top-3 h-5 w-5 rounded-tl-md border-l-2 border-t-2 border-amber-600/40" />
          <div className="absolute right-3 top-3 h-5 w-5 rounded-tr-md border-r-2 border-t-2 border-amber-600/40" />
          <div className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-amber-600/40" />
          <div className="absolute bottom-3 right-3 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-amber-600/40" />

          {/* Branding */}
          <div className="mb-2 flex items-center justify-center gap-2">
            <Award className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            <span className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
              BIMPACC
            </span>
          </div>

          <h2 className="mb-1 text-xl font-heading font-bold tracking-tight sm:text-2xl">
            Certificate of Completion
            </h2>

          {/* Decorative separator */}
          <div className="mx-auto my-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-600/30" />
            <div className="h-1.5 w-1.5 rounded-full bg-amber-600/40" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-600/30" />
          </div>

          <p className="text-sm text-muted-foreground">This is to certify that</p>

          <p className="my-3 text-2xl font-heading font-bold sm:text-3xl text-foreground">
            {certificate.user_name}
          </p>

          <p className="text-sm text-muted-foreground">has successfully completed the course</p>

          <p className="mt-1 text-lg font-semibold">{certificate.course_title}</p>

          {/* Bottom decorative separator */}
          <div className="mx-auto my-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-600/30" />
            <Award className="h-3.5 w-3.5 text-amber-600/40" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-600/30" />
          </div>

          {/* Certificate details */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div>
              <span className="block font-medium text-foreground">Certificate Number</span>
              <span className="font-mono">{certificate.certificate_number}</span>
            </div>
            <div>
              <span className="block font-medium text-foreground">Issued</span>
              <span>{issuedDate}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={copyCertificateNumber}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Certificate Number
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
