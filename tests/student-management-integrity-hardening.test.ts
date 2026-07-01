import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

const migrationPath = "supabase/migrations/20260701000000_student_management_integrity_hardening.sql";
const migration = read(migrationPath);

test("privileged teacher-promotion RPC is not executable by public users", () => {
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.setup_teacher_account\(TEXT\) FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.setup_teacher_account\(TEXT\) TO service_role;/,
  );
});

test("exam result drafts use the atomic relationship-validating RPC", () => {
  const action = read("src/app/actions/exams.ts");
  assert.match(action, /save_exam_results_draft_atomic/);
  assert.match(migration, /Result student does not match the supplied enrollment/);
  assert.match(migration, /Enrollment does not belong to the examination batch/);
  assert.match(migration, /Results may only be entered for active enrollments/);
});

test("result publication ranking is database-atomic", () => {
  const action = read("src/app/actions/exams.ts");
  assert.doesNotMatch(action, /for \(const row of rankedResults\)/);
  assert.match(migration, /CREATE TRIGGER validate_exam_state_change/);
  assert.match(migration, /RANK\(\) OVER \(ORDER BY obtained_marks DESC\)/);
});

test("enrollment activation and registration approval share one transaction", () => {
  const action = read("src/app/actions/teacher.ts");
  assert.match(action, /create_enrollment_atomic/);
  assert.match(action, /update_enrollment_status_atomic/);
  assert.match(migration, /CREATE TRIGGER approve_student_on_active_enrollment/);
});

test("payment relationships and statuses are verified server-side", () => {
  const action = read("src/app/actions/payments.ts");
  assert.match(action, /Payment student, enrollment, and batch do not match/);
  assert.match(action, /student_id: enrollment\.student_id/);
  assert.match(migration, /validate_payment_integrity/);
  assert.match(migration, /UNPAID records must have a paid amount of zero/);
});

test("student account status mutation cannot target teacher profiles", () => {
  const action = read("src/app/actions/teacher.ts");
  assert.match(action, /\.eq\("role", "STUDENT"\)/);
  assert.match(action, /\.from\("student_profiles"\)/);
});

test("student exam details are bound to both exam and URL batch", () => {
  const page = read("src/app/student/batches/[batchId]/exams/[examId]/page.tsx");
  assert.match(page, /\.eq\("id", examId\)[\s\S]*?\.eq\("batch_id", batchId\)/);
});

test("material dynamic route uses a real Next.js segment", () => {
  assert.ok(
    existsSync(join(root, "src/app/student/batches/[batchId]/materials/[contentId]/page.tsx")),
  );
  assert.equal(
    existsSync(join(root, "src/app/student/batches/[batchId]/materials/%5BcontentId%5D/page.tsx")),
    false,
  );
});

test("service-role teacher payment pages have local teacher guards", () => {
  const pages = [
    "src/app/teacher/students/[studentId]/payments/page.tsx",
    "src/app/teacher/payments/[paymentId]/page.tsx",
    "src/app/teacher/batches/[batchId]/payments/page.tsx",
  ];

  for (const pagePath of pages) {
    const page = read(pagePath);
    assert.match(page, /import \{ requireTeacher \} from "@\/lib\/auth-guards"/);
    assert.match(page, /await requireTeacher\(\);/);
  }
});

test("multi-table profile changes use atomic RPCs", () => {
  const action = read("src/app/actions/profiles.ts");
  assert.match(action, /update_student_profile_self_atomic/);
  assert.match(action, /update_teacher_profile_self_atomic/);
  assert.match(action, /update_student_profile_by_teacher_atomic/);
  assert.match(migration, /sync_profile_email_after_auth_change/);
});
