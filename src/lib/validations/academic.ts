import { z } from "zod";

export const subjectStatuses = [
  "DRAFT",
  "UPCOMING",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const subjectUnitStatuses = [
  "PLANNED",
  "RUNNING",
  "COMPLETED",
  "SKIPPED",
] as const;

export const subjectUnitTypes = ["CHAPTER", "TOPIC", "MODULE"] as const;

export const subjectThemeKeys = [
  "NAVY",
  "BLUE",
  "VIOLET",
  "EMERALD",
  "AMBER",
  "ROSE",
] as const;

export type SubjectStatus = (typeof subjectStatuses)[number];
export type SubjectUnitStatus = (typeof subjectUnitStatuses)[number];
export type SubjectUnitType = (typeof subjectUnitTypes)[number];
export type SubjectThemeKey = (typeof subjectThemeKeys)[number];

const optionalDate = z.string().date().optional().nullable().or(z.literal(""));

export const batchSubjectSchema = z
  .object({
    batchId: z.string().uuid("A valid batch is required"),
    name: z.string().trim().min(1, "Subject name is required").max(120),
    code: z
      .string()
      .trim()
      .min(1, "Subject code is required")
      .max(30)
      .transform((value) => value.toUpperCase())
      .refine(
        (value) => /^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(value),
        "Use only letters, numbers, hyphens, and underscores"
      ),
    description: z.string().trim().max(2000).optional().nullable().or(z.literal("")),
    status: z.enum(subjectStatuses).default("DRAFT"),
    startDate: optionalDate,
    endDate: optionalDate,
    themeKey: z.enum(subjectThemeKeys).default("NAVY"),
    displayOrder: z.coerce.number().int().nonnegative().default(0),
    weight: z.coerce.number().positive().max(100).default(1),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: "End date cannot be before start date",
      path: ["endDate"],
    }
  );

export const subjectUnitSchema = z
  .object({
    subjectId: z.string().uuid("A valid subject is required"),
    title: z.string().trim().min(1, "Unit title is required").max(180),
    description: z.string().trim().max(2000).optional().nullable().or(z.literal("")),
    unitType: z.enum(subjectUnitTypes).default("CHAPTER"),
    status: z.enum(subjectUnitStatuses).default("PLANNED"),
    sequenceNo: z.coerce.number().int().positive("Sequence must be at least 1"),
    weight: z.coerce.number().positive().max(100).default(1),
    plannedStartDate: optionalDate,
    plannedEndDate: optionalDate,
  })
  .refine(
    (data) =>
      !data.plannedStartDate ||
      !data.plannedEndDate ||
      data.plannedEndDate >= data.plannedStartDate,
    {
      message: "Planned end date cannot be before the start date",
      path: ["plannedEndDate"],
    }
  );

const subjectTransitionMap: Record<SubjectStatus, readonly SubjectStatus[]> = {
  DRAFT: ["UPCOMING", "RUNNING", "COMPLETED", "ARCHIVED"],
  UPCOMING: ["DRAFT", "RUNNING", "PAUSED", "COMPLETED", "ARCHIVED"],
  RUNNING: ["UPCOMING", "PAUSED", "COMPLETED", "ARCHIVED"],
  PAUSED: ["UPCOMING", "RUNNING", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["DRAFT", "UPCOMING", "RUNNING", "ARCHIVED"],
  ARCHIVED: ["DRAFT", "UPCOMING", "RUNNING"],
};

const subjectUnitTransitionMap: Record<
  SubjectUnitStatus,
  readonly SubjectUnitStatus[]
> = {
  PLANNED: ["RUNNING", "COMPLETED", "SKIPPED"],
  RUNNING: ["PLANNED", "COMPLETED", "SKIPPED"],
  COMPLETED: ["RUNNING", "PLANNED"],
  SKIPPED: ["PLANNED", "RUNNING"],
};

export function isValidSubjectStatusTransition(
  current: SubjectStatus,
  next: SubjectStatus
): boolean {
  return current === next || subjectTransitionMap[current].includes(next);
}

export function isValidSubjectUnitStatusTransition(
  current: SubjectUnitStatus,
  next: SubjectUnitStatus
): boolean {
  return current === next || subjectUnitTransitionMap[current].includes(next);
}

export type BatchSubjectInput = z.infer<typeof batchSubjectSchema>;
export type SubjectUnitInput = z.infer<typeof subjectUnitSchema>;
