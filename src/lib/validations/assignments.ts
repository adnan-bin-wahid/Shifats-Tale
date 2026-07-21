import { z } from "zod";

export const assignmentTypes = [
  "HOMEWORK",
  "CLASSWORK",
  "PRACTICE",
  "PROJECT",
] as const;

export const assignmentStatuses = [
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
] as const;

export const assignmentSubmissionStatuses = [
  "SUBMITTED",
  "LATE",
  "REVIEWED",
  "RETURNED",
] as const;

export type AssignmentType = (typeof assignmentTypes)[number];
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export type AssignmentSubmissionStatus =
  (typeof assignmentSubmissionStatuses)[number];

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .nullable()
  .or(z.literal(""))
  .refine(
    (value) => !value || /^https?:\/\//i.test(value),
    "Enter a complete http:// or https:// link"
  );

export const assignmentSchema = z
  .object({
    batchId: z.string().uuid("A valid batch is required"),
    subjectId: z.string().uuid("A valid subject is required"),
    unitId: z.string().uuid().optional().nullable().or(z.literal("")),
    title: z.string().trim().min(1, "Assignment title is required").max(180),
    description: z.string().trim().max(3000).optional().nullable().or(z.literal("")),
    instructions: z.string().trim().max(8000).optional().nullable().or(z.literal("")),
    assignmentType: z.enum(assignmentTypes).default("HOMEWORK"),
    status: z.enum(assignmentStatuses).default("DRAFT"),
    assignedAt: z.string().datetime({ local: true }),
    dueAt: z.string().datetime({ local: true }),
    totalMarks: z.coerce.number().positive("Total marks must be greater than 0").max(10000),
    allowLateSubmission: z.coerce.boolean().default(false),
    resourceUrl: optionalUrl,
  })
  .refine((data) => new Date(data.dueAt) > new Date(data.assignedAt), {
    message: "Due time must be after the release time",
    path: ["dueAt"],
  });

export const studentSubmissionSchema = z
  .object({
    assignmentId: z.string().uuid(),
    submissionText: z.string().trim().max(12000).optional().nullable().or(z.literal("")),
    submissionUrl: optionalUrl,
  })
  .refine(
    (data) => Boolean(data.submissionText?.trim() || data.submissionUrl?.trim()),
    {
      message: "Write a response or add a submission link",
      path: ["submissionText"],
    }
  );

export const assignmentReviewSchema = z.object({
  submissionId: z.string().uuid(),
  decision: z.enum(["REVIEWED", "RETURNED"]),
  marksObtained: z
    .union([z.coerce.number().nonnegative(), z.literal(""), z.null()])
    .optional(),
  feedback: z.string().trim().max(5000).optional().nullable().or(z.literal("")),
});

const statusTransitions: Record<
  AssignmentStatus,
  readonly AssignmentStatus[]
> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "CLOSED", "ARCHIVED"],
  CLOSED: ["PUBLISHED", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function isValidAssignmentStatusTransition(
  current: AssignmentStatus,
  next: AssignmentStatus
) {
  return current === next || statusTransitions[current].includes(next);
}

export type AssignmentInput = z.infer<typeof assignmentSchema>;
