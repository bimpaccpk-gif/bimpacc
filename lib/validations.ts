import { z } from "zod";

// ─── Auth ──────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .refine((email) => email.toLowerCase().endsWith("@gmail.com"), {
      message: "Only Gmail emails are allowed",
    }),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be at most 100 characters")
      .trim(),
    email: z
      .string()
      .email("Invalid email address")
      .refine((email) => email.toLowerCase().endsWith("@gmail.com"), {
        message: "Only Gmail emails are allowed",
      }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
    courseId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Courses ───────────────────────────────────────────────

export const createCourseSchema = z.object({
  title: z.string().min(1, "Course title is required").max(200).trim(),
  description: z.string().max(2000).trim().optional().default(""),
  batch: z.string().min(1, "Batch is required").max(50).trim(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  hierarchyType: z.coerce.number().int().min(1).max(3).default(1),
  registrationOpen: z.boolean().default(false),
});

export const updateCourseSchema = z.object({
  id: z.string().uuid("Invalid course ID"),
  title: z.string().min(1, "Course title is required").max(200).trim(),
  description: z.string().max(2000).trim().optional().default(""),
  batch: z.string().min(1, "Batch is required").max(50).trim(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  registrationOpen: z.boolean().default(false),
});

// ─── Subjects ──────────────────────────────────────────────

export const createSubjectSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z.string().min(1, "Subject title is required").max(200).trim(),
  description: z.string().max(2000).trim().optional().default(""),
});

export const updateSubjectSchema = z.object({
  id: z.string().uuid("Invalid subject ID"),
  courseId: z.string().uuid("Invalid course ID"),
  title: z.string().min(1, "Subject title is required").max(200).trim(),
  description: z.string().max(2000).trim().optional().default(""),
});

// ─── Lessons ───────────────────────────────────────────────

export const createLessonSchema = z
  .object({
    subjectId: z.string().uuid().optional().nullable(),
    courseId: z.string().uuid().optional().nullable(),
    title: z.string().min(1, "Lesson title is required").max(200).trim(),
    description: z.string().max(5000).trim().optional().default(""),
    content: z.string().max(50000).trim().optional().default(""),
    videoUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
    durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
  })
  .refine((data) => data.subjectId || data.courseId, {
    message: "Either Subject ID or Course ID is required",
  });

export const updateLessonSchema = z.object({
  id: z.string().uuid("Invalid lesson ID"),
  subjectId: z.string().uuid().optional().nullable(),
  courseId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Lesson title is required").max(200).trim(),
  description: z.string().max(5000).trim().optional().default(""),
  content: z.string().max(50000).trim().optional().default(""),
  videoUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
});

// ─── User Management ───────────────────────────────────────

export const adminCreateUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100).trim(),
  email: z
    .string()
    .email("Invalid email address")
    .refine((email) => email.toLowerCase().endsWith("@gmail.com"), {
      message: "Only Gmail emails are allowed",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  role: z.enum(["admin", "instructor", "student"]).default("student"),
  courseId: z.string().uuid().optional().nullable(),
  bypassOnboarding: z.boolean().default(false),
});

export const changeRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["admin", "instructor", "student"]),
});

// ─── Student Onboarding ────────────────────────────────────

export const onboardingSchema = z.object({
  fatherName: z.string().min(1, "Father's name is required").max(100).trim(),
  cnicNumber: z.string().min(1, "CNIC number is required").max(20).trim(),
  dob: z.string().min(1, "Date of birth is required"),
  bankName: z.string().max(100).trim().optional().default(""),
  educationLevel: z.string().min(1, "Education level is required").max(50).trim(),
  degreeTitle: z.string().max(200).trim().optional().default(""),
  profession: z.string().max(200).trim().optional().default(""),
  whatsappNumber: z.string().min(1, "WhatsApp number is required").max(20).trim(),
  postalAddress: z.string().max(500).trim().optional().default(""),
  feeTransactionId: z.string().min(1, "Fee transaction ID is required").max(100).trim(),
  feeSubmissionDate: z.string().min(1, "Fee submission date is required"),
  declarationAccepted: z.literal(true, { error: "You must accept the declaration" }),
});

// ─── Admin User Actions ───────────────────────────────────

export const updateStudentProfileSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100)
    .trim()
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  father_name: z.string().max(100).trim().optional().or(z.literal("")),
  cnic_number: z.string().max(20).trim().optional().or(z.literal("")),
  dob: z.string().optional().or(z.literal("")),
  bank_name: z.string().max(100).trim().optional().or(z.literal("")),
  education_level: z.string().max(50).trim().optional().or(z.literal("")),
  degree_title: z.string().max(200).trim().optional().or(z.literal("")),
  profession: z.string().max(200).trim().optional().or(z.literal("")),
  whatsapp_number: z.string().max(20).trim().optional().or(z.literal("")),
  postal_address: z.string().max(500).trim().optional().or(z.literal("")),
  fee_transaction_id: z.string().max(100).trim().optional().or(z.literal("")),
  fee_submission_date: z.string().optional().or(z.literal("")),
});

export const toggleUserPauseSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  isPaused: z.coerce.boolean(),
});

export const resetDeviceFingerprintSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// ─── Enrollment ─────────────────────────────────────────────

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  courseId: z.string().uuid("Invalid course ID"),
});

// ─── Content Access ───────────────────────────────────────

export const setStudentContentAccessSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  contentType: z.enum(["course", "semester", "subject", "lesson"]),
  contentId: z.string().uuid("Invalid content ID"),
  isPaused: z.coerce.boolean(),
  reason: z.string().max(500).optional().default(""),
});

export const bulkPauseForStudentsSchema = z.object({
  contentType: z.enum(["course", "semester", "subject", "lesson"]),
  contentId: z.string().uuid("Invalid content ID"),
  isPaused: z.coerce.boolean(),
  studentIds: z.array(z.string().uuid()).min(1, "At least one student is required"),
});

// ─── Attendance ────────────────────────────────────────────

export const importAttendanceSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  sessionDuration: z.coerce.number().positive("Session duration must be greater than 0"),
  csvContent: z.string().min(1, "CSV content is required"),
});

export const markAttendanceSchema = z.object({
  enrollmentId: z.string().uuid("Invalid enrollment ID"),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  status: z.enum(["present", "absent", "late", "excused"]),
  sessionDuration: z.coerce.number().positive().optional().nullable(),
});

export const deleteAttendanceSchema = z.object({
  recordId: z.string().uuid("Invalid record ID"),
});

// ─── Service Billing ──────────────────────────────────────

const nullableText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `Must be ${maximum} characters or fewer`)
    .transform((value) => value || null);

const nullableDate = z
  .string()
  .trim()
  .refine((value) => {
    if (value === "") return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Invalid date")
  .transform((value) => value || null);

const nullableDateTime = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(`${value}:00+05:00`))),
    "Invalid date and time"
  )
  .transform((value) => value || null);

const nullableAmount = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce
    .number()
    .finite("Amount must be a valid number")
    .nonnegative("Amount cannot be negative")
    .nullable()
);

export const serviceBillingSettingsSchema = z
  .object({
    enforcementEnabled: z.boolean(),
    paymentStatus: z.enum(["pending", "paid", "waived"]),
    amountDue: nullableAmount,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a three-letter code such as PKR"),
    billingInterval: z.enum(["monthly", "quarterly", "yearly", "custom"]),
    servicePeriodStart: nullableDate,
    servicePeriodEnd: nullableDate,
    paymentDueAt: nullableDateTime,
    gracePeriodEndsAt: nullableDateTime,
    bankName: nullableText(150),
    accountTitle: nullableText(150),
    accountNumber: nullableText(100),
    iban: nullableText(100),
    paymentReference: nullableText(150),
    paymentInstructions: nullableText(2000),
    supportEmail: z
      .string()
      .trim()
      .max(320)
      .refine(
        (value) => value === "" || z.string().email().safeParse(value).success,
        "Invalid support email"
      )
      .transform((value) => value || null),
    supportPhone: nullableText(50),
    noticeTitle: z.string().trim().min(1, "Notice title is required").max(200),
    noticeMessage: z.string().trim().min(1, "Notice message is required").max(3000),
    confirmEnforcement: z.boolean(),
  })
  .superRefine((data, context) => {
    if (
      data.servicePeriodStart &&
      data.servicePeriodEnd &&
      data.servicePeriodEnd < data.servicePeriodStart
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["servicePeriodEnd"],
        message: "Service period end must be on or after its start date",
      });
    }

    if (data.paymentDueAt && data.gracePeriodEndsAt && data.gracePeriodEndsAt < data.paymentDueAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gracePeriodEndsAt"],
        message: "Grace period must end on or after the payment due time",
      });
    }

    if (data.enforcementEnabled && data.paymentStatus === "pending") {
      if (!data.paymentDueAt || !data.gracePeriodEndsAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gracePeriodEndsAt"],
          message: "A due time and grace-period end are required before enforcement can be enabled",
        });
      }

      if (!data.confirmEnforcement) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmEnforcement"],
          message:
            "Confirm that the disclosed grace period may limit normal admin dashboard access",
        });
      }
    }
  });

export const adminDashboardAccessSchema = z.object({
  accessMode: z.enum(["mark_paid_unlock", "unlock", "enforce"]),
  confirmAccessEnforcement: z.boolean(),
});

// ─── Helper ────────────────────────────────────────────────

/**
 * Validate form data against a Zod schema.
 * Returns parsed data or an error message string.
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  formData: Record<string, unknown>
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(formData);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message ?? "Validation failed" };
}
