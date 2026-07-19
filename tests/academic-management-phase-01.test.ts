import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  batchSubjectSchema,
  isValidSubjectStatusTransition,
  isValidSubjectUnitStatusTransition,
  subjectUnitSchema,
} from "../src/lib/validations/academic";
import {
  calculateBatchAcademicProgress,
  calculateExamJourneyProgress,
  calculateStudentPerformanceProgress,
  calculateSyllabusProgress,
} from "../src/lib/academic/progress";

test("Academic Management Phase 01", async (t) => {
  await t.test("validates and normalizes a batch subject", () => {
    const parsed = batchSubjectSchema.safeParse({
      batchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Higher Mathematics",
      code: "hmath-1",
      status: "UPCOMING",
      startDate: "2026-07-20",
      endDate: "2026-12-20",
      themeKey: "VIOLET",
      displayOrder: 2,
      weight: 1.5,
    });

    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.code, "HMATH-1");
  });

  await t.test("rejects invalid subject dates and codes", () => {
    const invalidDates = batchSubjectSchema.safeParse({
      batchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Physics",
      code: "Physics Code!",
      startDate: "2026-08-01",
      endDate: "2026-07-01",
    });

    assert.equal(invalidDates.success, false);
  });

  await t.test("validates ordered syllabus units", () => {
    const valid = subjectUnitSchema.safeParse({
      subjectId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      title: "Vectors",
      unitType: "CHAPTER",
      status: "RUNNING",
      sequenceNo: 1,
      weight: 2,
      plannedStartDate: "2026-07-20",
      plannedEndDate: "2026-07-31",
    });
    const invalidSequence = subjectUnitSchema.safeParse({
      subjectId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      title: "Vectors",
      sequenceNo: 0,
    });

    assert.equal(valid.success, true);
    assert.equal(invalidSequence.success, false);
  });

  await t.test("enforces explicit subject and unit status transitions", () => {
    assert.equal(isValidSubjectStatusTransition("DRAFT", "RUNNING"), true);
    assert.equal(isValidSubjectStatusTransition("RUNNING", "DRAFT"), false);
    assert.equal(isValidSubjectStatusTransition("COMPLETED", "UPCOMING"), true);
    assert.equal(isValidSubjectUnitStatusTransition("PLANNED", "COMPLETED"), true);
    assert.equal(isValidSubjectUnitStatusTransition("SKIPPED", "COMPLETED"), false);
  });

  await t.test("calculates weighted syllabus progress and excludes skipped units", () => {
    const progress = calculateSyllabusProgress([
      { status: "COMPLETED", weight: 2 },
      { status: "RUNNING", weight: 1 },
      { status: "SKIPPED", weight: 10 },
    ]);

    assert.deepEqual(progress, {
      totalUnits: 2,
      completedUnits: 1,
      runningUnits: 1,
      plannedUnits: 0,
      skippedUnits: 1,
      totalWeight: 3,
      completedWeight: 2,
      percentage: 66.67,
    });
  });

  await t.test("excludes draft and archived subjects from batch progress", () => {
    const progress = calculateBatchAcademicProgress([
      {
        status: "RUNNING",
        units: [
          { status: "COMPLETED", weight: 1 },
          { status: "PLANNED", weight: 1 },
        ],
      },
      {
        status: "DRAFT",
        units: [{ status: "COMPLETED", weight: 20 }],
      },
      {
        status: "ARCHIVED",
        units: [{ status: "COMPLETED", weight: 20 }],
      },
    ]);

    assert.equal(progress.totalUnits, 2);
    assert.equal(progress.percentage, 50);
  });

  await t.test("separates exam-plan progress from result-publication progress", () => {
    const progress = calculateExamJourneyProgress([
      { status: "DRAFT" },
      { status: "CANCELLED" },
      { status: "SCHEDULED" },
      { status: "COMPLETED" },
      { status: "RESULT_DRAFT" },
      { status: "RESULT_PUBLISHED", publishedAt: "2026-07-10T10:00:00Z" },
      { status: "ARCHIVED", publishedAt: "2026-06-10T10:00:00Z" },
    ]);

    assert.deepEqual(progress, {
      plannedExams: 5,
      scheduledExams: 1,
      conductedExams: 4,
      publishedResults: 2,
      planPercentage: 80,
      publicationPercentage: 50,
    });
  });

  await t.test("keeps absence separate from the weighted score average", () => {
    const progress = calculateStudentPerformanceProgress([
      {
        attendanceStatus: "PRESENT",
        obtainedMarks: 80,
        totalMarks: 100,
        passMarks: 40,
      },
      {
        attendanceStatus: "PRESENT",
        obtainedMarks: 20,
        totalMarks: 50,
        passMarks: 25,
      },
      {
        attendanceStatus: "ABSENT",
        obtainedMarks: null,
        totalMarks: 100,
        passMarks: 40,
      },
    ]);

    assert.deepEqual(progress, {
      publishedExamCount: 3,
      attendedExamCount: 2,
      missedExamCount: 1,
      passedExamCount: 1,
      failedExamCount: 1,
      participationPercentage: 66.67,
      averagePercentage: 66.67,
    });
  });

  await t.test("migration contains the required compatibility and security contracts", () => {
    const migrationPath = fileURLToPath(
      new URL(
        "../supabase/migrations/20260719000000_academic_management_phase_01.sql",
        import.meta.url
      )
    );
    const sql = readFileSync(migrationPath, "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.batch_subjects/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.subject_units/);
    assert.match(sql, /sync_default_subject_from_legacy_batch/);
    assert.match(sql, /assign_default_subject_to_exam/);
    assert.match(sql, /FOREIGN KEY \(subject_id, batch_id\)/);
    assert.match(sql, /ALTER COLUMN subject_id SET NOT NULL/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
    assert.match(sql, /WITH \(security_invoker = true\)/);
    assert.match(sql, /student_subject_performance/);
  });
});
