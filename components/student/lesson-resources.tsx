"use client"

import { Paperclip, FileText, FileSpreadsheet, FileImage, FileArchive, File, Download } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LessonResourceItem {
  id: string
  file_name: string
  file_size: number | null
  file_type: string | null
  signed_url: string
}

export interface LessonResourcesProps {
  resources: LessonResourceItem[]
}

function getFileIcon(fileType: string | null, fileName: string) {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase()
  const type = (fileType ?? ext)

  // Spreadsheet types
  if (["xlsx", "xls", "csv"].includes(ext) || type.includes("spreadsheet") || type.includes("excel")) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
  }
  // Image types
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || type.startsWith("image/")) {
    return <FileImage className="h-5 w-5 text-purple-600 dark:text-purple-400" />
  }
  // Archive types
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || type.includes("compressed") || type.includes("archive")) {
    return <FileArchive className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
  }
  // PDF
  if (ext === "pdf" || type === "application/pdf") {
    return <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
  }
  // Word/Document types
  if (["doc", "docx", "txt", "rtf"].includes(ext) || type.includes("document") || type.includes("word") || type.includes("text")) {
    return <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  }

  return <File className="h-5 w-5 text-muted-foreground" />
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LessonResources({ resources }: LessonResourcesProps) {
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/50 px-4 py-8 text-center">
        <Paperclip className="h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No resources attached to this lesson</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex items-center gap-1.5">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Lesson Resources</span>
      </div>
      {resources.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 transition-colors hover:bg-muted/50"
        >
          {getFileIcon(r.file_type, r.file_name)}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(r.file_size)}
              {r.file_type && <span className="ml-1 uppercase">&middot; {r.file_type.split("/")[1] ?? extOnly(r.file_name)}</span>}
            </p>
          </div>
          <a
            href={r.signed_url}
            download={r.file_name}
            className="shrink-0"
            title="Download"
          >
            <Download className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
          </a>
        </div>
      ))}
    </div>
  )
}

function extOnly(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? ""
}
