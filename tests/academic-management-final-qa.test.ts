import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { calculateSyllabusProgress } from "../src/lib/academic/progress";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Academic Management Final Polish & QA", () => {
  it("restores the complete approved Phase 07 routine contract", () => {
    const migration = source(
      "supabase/migrations/20260721000000_academic_management_phase_07_class_routine.sql"
    );
    const teacherPage = source("src/app/teacher/routine/page.tsx");
    const studentPage = source("src/app/student/routine/page.tsx");
    const types = source("src/types/database.types.ts");

    assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.academic_class_sessions/);
    assert.match(migration, /public\.has_active_enrollment\(batch_id\)/);
    assert.match(teacherPage, /Academic Class Routine/);
    assert.match(studentPage, /My Class Routine/);
    assert.match(types, /academic_class_sessions:/);
  });

  it("keeps overall report progress weight-aware", () => {
    const weighted = calculateSyllabusProgress([
      { status: "COMPLETED", weight: 9 },
      { status: "PLANNED", weight: 1 },
    ]);
    const reportSource = source(
      "src/lib/reports/student-progress-report-data.ts"
    );

    assert.equal(weighted.percentage, 90);
    assert.match(
      reportSource,
      /const overallSyllabusProgress = calculateSyllabusProgress\(units\)/
    );
    assert.match(
      reportSource,
      /syllabusPercentage = overallSyllabusProgress\.percentage/
    );
  });

  it("shows only reportable batches in the progress-report directory", () => {
    const directory = source(
      "src/lib/reports/student-progress-report-directory.ts"
    );
    assert.match(directory, /eligibleBatchIds/);
    assert.match(directory, /filter\(\(batch\) => eligibleBatchIds\.has\(batch\.id\)\)/);
  });

  it("normalizes teacher assignment and routine URL filters", () => {
    const assignments = source("src/app/teacher/assignments/page.tsx");
    const routine = source("src/app/teacher/routine/page.tsx");

    for (const page of [assignments, routine]) {
      assert.match(page, /UUID_PATTERN/);
      assert.match(page, /slice\(0, 120\)/);
    }
    assert.match(assignments, /assignmentStatuses\.includes/);
    assert.match(routine, /classSessionStatuses\.includes/);
  });

  it("scopes assignment review counts to visible assignments", () => {
    const assignments = source("src/app/teacher/assignments/page.tsx");
    assert.match(assignments, /const assignmentIds = assignments\.map/);
    assert.match(assignments, /\.in\("assignment_id", assignmentIds\)/);
  });

  it("ships report loading, retry, and accessible form-validation states", () => {
    const reportError = source("src/app/teacher/reports/error.tsx");
    const reportLoading = source("src/app/teacher/reports/loading.tsx");
    const assignmentForm = source(
      "src/components/assignments/assignment-form.tsx"
    );
    const routineForm = source(
      "src/components/class-routine/class-session-form.tsx"
    );

    assert.match(reportError, /onClick=\{unstable_retry\}/);
    assert.match(reportLoading, /LoadingState/);
    assert.match(assignmentForm, /role="alert"/);
    assert.match(routineForm, /role="alert"/);
  });
});
