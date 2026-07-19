import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    "utf8"
  );
}

test("Academic Management Phase 03", async (t) => {
  await t.test("scopes the academic overview to active student enrollments", () => {
    const overview = readProjectFile("src/app/student/academics/page.tsx");

    assert.match(overview, /destination !== "STUDENT_DASHBOARD"/);
    assert.match(overview, /\.eq\("student_id", studentProfile\.id\)/);
    assert.match(overview, /\.eq\("status", "ACTIVE"\)/);
    assert.match(overview, /\.in\("batch_id", batchIds\)/);
    assert.match(overview, /student_subject_performance/);
    assert.doesNotMatch(overview, /createAdminClient/);
  });

  await t.test("checks batch enrollment before loading detailed academic data", () => {
    const page = readProjectFile(
      "src/app/student/batches/[batchId]/academics/page.tsx"
    );
    const enrollmentQuery = page.indexOf('.from("enrollments")');
    const batchQuery = page.indexOf('.from("batches")');

    assert.ok(enrollmentQuery >= 0);
    assert.ok(batchQuery > enrollmentQuery);
    assert.match(page, /\.eq\("student_id", studentProfile\.id\)/);
    assert.match(page, /\.eq\("batch_id", batchId\)/);
    assert.match(page, /\.eq\("status", "ACTIVE"\)/);
    assert.match(page, /unauthorized_batch/);
    assert.doesNotMatch(page, /createAdminClient/);
  });

  await t.test("keeps unpublished subjects and examinations outside the journey", () => {
    const page = readProjectFile(
      "src/app/student/batches/[batchId]/academics/page.tsx"
    );

    assert.match(page, /\.not\("status", "in", '\("DRAFT","ARCHIVED"\)'\)/);
    assert.match(page, /"SCHEDULED"/);
    assert.match(page, /"RESULT_DRAFT"/);
    assert.match(page, /"RESULT_PUBLISHED"/);
    assert.doesNotMatch(page, /\.in\("status", \[[\s\S]*?"DRAFT"/);
  });

  await t.test("renders the interactive subject, syllabus, exam, and performance views", () => {
    const journey = readProjectFile(
      "src/app/student/batches/[batchId]/academics/student-academic-journey.tsx"
    );

    assert.match(journey, /My subjects/);
    assert.match(journey, /Learning pulse/);
    assert.match(journey, /Subject progress map/);
    assert.match(journey, /Ordered learning path/);
    assert.match(journey, /Published result snapshot/);
    assert.match(journey, /activeTab === "syllabus"/);
    assert.match(journey, /activeTab === "exams"/);
  });

  await t.test("uses the database progress views instead of the old heuristic", () => {
    const batchPage = readProjectFile(
      "src/app/student/batches/[batchId]/page.tsx"
    );
    const sidebar = readProjectFile(
      "src/components/dashboard/student-sidebar.tsx"
    );

    assert.match(batchPage, /batch_academic_progress/);
    assert.match(batchPage, /academic_progress_percentage/);
    assert.match(batchPage, /exam_plan_progress_percentage/);
    assert.match(batchPage, /result_publication_progress_percentage/);
    assert.doesNotMatch(batchPage, /publishedBatchResults\.length \+ \(materialsCount/);
    assert.match(sidebar, /Academic Journey/);
    assert.match(sidebar, /\/student\/academics/);
  });

  await t.test("retains RLS and security-invoker protection for student academic reads", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260719000000_academic_management_phase_01.sql"
    );

    assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
    assert.match(migration, /public\.has_active_enrollment\(batch_id\)/);
    assert.match(migration, /status::text NOT IN \('DRAFT', 'ARCHIVED'\)/);
    assert.match(migration, /WITH \(security_invoker = true\)/);
    assert.match(migration, /student_subject_performance/);
  });
});

