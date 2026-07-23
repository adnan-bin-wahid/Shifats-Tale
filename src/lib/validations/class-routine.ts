import { z } from "zod";

export const classSessionTypes = [
  "REGULAR",
  "REVISION",
  "EXTRA_CLASS",
  "EXAM_PREP",
] as const;

export const classSessionStatuses = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ClassSessionStatus = (typeof classSessionStatuses)[number];

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

export const classSessionSchema = z
  .object({
    batchId: z.string().uuid("A valid batch is required"),
    subjectId: z.string().uuid("A valid subject is required"),
    unitId: z.string().uuid().optional().nullable().or(z.literal("")),
    title: z.string().trim().min(1, "Class title is required").max(180),
    sessionType: z.enum(classSessionTypes).default("REGULAR"),
    status: z.enum(classSessionStatuses).default("SCHEDULED"),
    startsAt: z.string().datetime({ local: true }),
    endsAt: z.string().datetime({ local: true }),
    location: z.string().trim().max(240).optional().nullable().or(z.literal("")),
    classLink: optionalUrl,
    studentNote: z.string().trim().max(3000).optional().nullable().or(z.literal("")),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End time must be after start time",
    path: ["endsAt"],
  })
  .refine(
    (data) =>
      new Date(data.endsAt).getTime() - new Date(data.startsAt).getTime() <=
      12 * 60 * 60 * 1000,
    {
      message: "A class session cannot be longer than 12 hours",
      path: ["endsAt"],
    }
  );

const statusTransitions: Record<
  ClassSessionStatus,
  readonly ClassSessionStatus[]
> = {
  SCHEDULED: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["SCHEDULED"],
  CANCELLED: ["SCHEDULED"],
};

export function isValidClassSessionStatusTransition(
  current: ClassSessionStatus,
  next: ClassSessionStatus
) {
  return current === next || statusTransitions[current].includes(next);
}

export type ClassSessionInput = z.infer<typeof classSessionSchema>;
