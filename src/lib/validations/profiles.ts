import { z } from "zod";

// Phone validation helper
const phoneRegex = /^\+?[0-9]{10,15}$/;
const validatePhone = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => phoneRegex.test(val.replace(/[\s()-]/g, "")), {
    message: "Invalid phone number format. Provide a valid number.",
  });

export const studentProfileSelfSchema = z.object({
  phone: validatePhone,
  guardianName: z.string().min(2, "Guardian name must be at least 2 characters"),
  guardianPhone: validatePhone,
  address: z.string().min(5, "Address must be at least 5 characters"),
  dateOfBirth: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const teacherProfileSelfSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email format"),
  designation: z.string().min(2, "Designation is required"),
  coachingCenterName: z.string().min(2, "Coaching center name is required"),
  publicContactInfo: z.string().min(2, "Public contact information is required"),
  avatarUrl: z.string().url().optional().nullable(),
});

export const studentProfileTeacherEditSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: validatePhone,
  academicLevel: z.string().min(1, "Academic level is required"),
  institution: z.string().min(2, "Institution is required"),
  guardianName: z.string().min(2, "Guardian name is required"),
  guardianPhone: validatePhone,
  address: z.string().min(5, "Address is required"),
  dateOfBirth: z.string().optional().nullable(),
  registrationStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  accountStatus: z.enum(["ACTIVE", "DISABLED", "ARCHIVED"]),
  teacherNote: z.string().optional().nullable(),
  studentCode: z.string().min(1, "Student ID cannot be empty"),
  correctionReason: z.string().optional().nullable(),
  confirmCorrection: z.boolean().optional(),
}).refine(
  (data) => {
    // If student code changes, check that confirmation and reason are supplied
    return true; // We will check this explicitly in the server action for finer user experience feedback
  }
);

export const appSettingsSchema = z.object({
  coachingCenterName: z.string().min(2, "Coaching center name is required"),
  shortName: z.string().min(1, "Short name is required"),
  studentIdPrefix: z
    .string()
    .min(1, "Student ID prefix is required")
    .max(10, "Student ID prefix must be 10 characters or fewer")
    .regex(/^[A-Za-z0-9]+$/, "Student ID prefix can contain only letters and numbers"),
  publicPhone: validatePhone,
  publicEmail: z.string().email("Invalid public email format"),
  address: z.string().min(5, "Address is required"),
  defaultCurrency: z.string().min(1, "Default currency is required"),
  defaultTimezone: z.string().min(1, "Timezone is required"),
  academicSession: z.string().min(1, "Academic session is required"),
  defaultGradingScale: z.string().min(1, "Grading scale is required"),
  pendingApprovalContactText: z.string().min(5, "Pending approval instructions required"),
  disabledAccountContactText: z.string().min(5, "Disabled account instructions required"),
  studentRankVisible: z.boolean(),
  completedBatchesVisible: z.boolean(),
  gradesDisplayed: z.boolean(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });
