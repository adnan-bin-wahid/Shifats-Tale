import { z } from "zod";

export const examSchema = z.object({
  batchId: z.string().uuid("Invalid batch ID"),
  subjectId: z.string().uuid("Select a valid subject"),
  name: z.string().min(1, "Examination name is required").max(100, "Name too long"),
  description: z.string().optional().nullable(),
  examType: z.enum([
    "CLASS_TEST",
    "WEEKLY_EXAM",
    "MONTHLY_EXAM",
    "MODEL_TEST",
    "ASSIGNMENT",
    "FINAL_EXAM",
  ], {
    message: "Invalid examination type",
  }),
  examDate: z.string().min(1, "Examination date is required"),
  totalMarks: z.preprocess(
    (val) => Number(val),
    z.number().positive("Total marks must be greater than zero")
  ),
  passMarks: z.preprocess(
    (val) => Number(val),
    z.number().min(0, "Pass marks cannot be negative")
  ),
  startTime: z.string().optional().nullable(),
  duration: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().positive("Duration must be positive").optional().nullable()
  ),
  resultPublicationNote: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
}).refine((data) => data.passMarks <= data.totalMarks, {
  message: "Pass marks cannot exceed total marks",
  path: ["passMarks"],
});
