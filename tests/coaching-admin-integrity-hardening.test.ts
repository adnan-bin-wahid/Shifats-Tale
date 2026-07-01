import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const migration = read("supabase/migrations/20260701000001_coaching_admin_integrity_hardening.sql");
const teacherActions = read("src/app/actions/teacher.ts");
const examActions = read("src/app/actions/exams.ts");
const materialActions = read("src/app/actions/materials.ts");
const rateLimit = read("src/lib/rate-limit.ts");
const reportRoute = read("src/app/api/reports/export/route.ts");
const materialRoute = read("src/app/api/materials/[contentId]/access/route.ts");
const csv = read("src/lib/csv.ts");
const contentActions = read("src/features/website-cms/actions/content-actions.ts");
const mediaActions = read("src/features/website-cms/actions/media-actions.ts");
const settings = read("src/lib/student-facing-settings.ts");

const normalize = (value: string) => value.replace(/\s+/g, " ");

test("batch capacity, dates, and dependency deletion are enforced in PostgreSQL", () => {
  assert.match(migration, /validate_batch_management_integrity/);
  assert.match(migration, /NEW\.end_date IS NOT NULL AND NEW\.end_date < NEW\.start_date/);
  assert.match(migration, /v_active_count > NEW\.capacity/);
  assert.match(migration, /prevent_batch_delete_with_dependencies/);
  for (const table of ["enrollments", "payments", "exams", "batch_contents", "announcements"]) {
    assert.match(migration, new RegExp(`FROM public\\.${table} WHERE batch_id = OLD\\.id`));
  }
});

test("batch deletion fails closed in the server action", () => {
  assert.match(teacherActions, /Promise\.all\(\[/);
  assert.match(teacherActions, /from\("batch_contents"\)/);
  assert.match(teacherActions, /from\("announcements"\)/);
  assert.match(teacherActions, /dependencyChecks\.some\(\(result\) => result\.error\)/);
});

test("student registration cannot contradict an active enrollment", () => {
  assert.match(migration, /validate_student_registration_state/);
  assert.match(migration, /status = 'ACTIVE'/);
  assert.match(migration, /update_student_registration_atomic/);
  assert.match(teacherActions, /rpc\("update_student_registration_atomic"/);
});

test("exam creation, transitions, archive, and deletion use dedicated lifecycle guards", () => {
  assert.match(migration, /validate_exam_insert_state/);
  assert.match(migration, /Results can only be published from result draft state/);
  assert.match(migration, /Published results must be withdrawn before another status transition/);
  assert.match(migration, /prevent_exam_delete_with_history/);
  assert.match(examActions, /New examinations can only be created as draft or scheduled/);
  assert.match(examActions, /status must be changed through the dedicated scheduling, result, or archive workflow/);
  assert.match(examActions, /Published results must be withdrawn before archiving/);
  assert.match(examActions, /Only draft examinations can be deleted/);
});

test("material edits persist a selected batch move and refresh both batch views", () => {
  assert.match(materialActions, /batch_id: data\.batchId/);
  assert.match(materialActions, /oldMaterial\.batch_id !== updatedMaterial\.batch_id/);
  assert.match(materialActions, /Target batch not found/);
});

test("CMS section lookup is bound to the requested page and mutations are audited", () => {
  const compact = normalize(contentActions);
  assert.match(compact, /from\("vw_public_site_pages"\).*eq\("page_key", pageKey\)/);
  assert.match(compact, /from\("vw_public_site_page_sections"\).*eq\("page_id", page\.id\).*eq\("section_key", sectionKey\)/);
  assert.match(contentActions, /CMS_PAGE_SECTION_UPDATED/);
  assert.match(contentActions, /revalidatePath\(publicPathForSlug\(page\.slug\)\)/);
});

test("CMS media deletion checks JSON section references and is database protected", () => {
  assert.match(mediaActions, /contains\("content", \{ mediaId \}\)/);
  assert.match(mediaActions, /CMS_MEDIA_UPLOADED/);
  assert.match(mediaActions, /CMS_MEDIA_DELETED/);
  assert.match(mediaActions, /public_id: verifiedAsset\.public_id/);
  assert.match(migration, /prevent_referenced_media_soft_delete/);
  assert.match(migration, /content->>'mediaId' = OLD\.id::TEXT/);
});

test("CSV output neutralizes spreadsheet formulas", () => {
  assert.match(csv, /\^\[\\t\\r \]\*\[=\+\\-@\]/);
  assert.match(csv, /str = `'\$\{str\}`/);
});

test("rate limiting is atomic and fails closed", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.consume_rate_limit/);
  assert.match(migration, /ON CONFLICT \(key\)/);
  assert.match(rateLimit, /rpc\("consume_rate_limit"/);
  assert.match(rateLimit, /throw new RateLimitUnavailableError/);
  assert.doesNotMatch(rateLimit, /Fail-open/);
});

test("authenticated principals, not spoofable IP strings, own report and material limits", () => {
  assert.match(reportRoute, /csv-export-\$\{profile\.id\}/);
  assert.match(materialRoute, /material-access-\$\{profileId\}/);
  assert.doesNotMatch(reportRoute, /csv-export-\$\{ip\}/);
});

test("report filters reject invalid input and examination results are fetched in one batch", () => {
  assert.match(reportRoute, /ALLOWED_TABS/);
  assert.match(reportRoute, /Unsupported report type/);
  assert.match(reportRoute, /Billing month must be between 1 and 12/);
  assert.match(reportRoute, /\.in\("exam_id", examIds\)/);
  assert.doesNotMatch(reportRoute, /for \(const exam of exams\) \{[\s\S]*?\.eq\("exam_id", exam\.id\)/);
});

test("configured student ID prefix controls future registrations", () => {
  assert.match(migration, /student_id_prefix/);
  assert.match(migration, /configured_prefix/);
  assert.match(migration, /REGEXP_REPLACE\(UPPER\(student_id_prefix\)/);
});

test("student-facing settings have safe defaults and are consumed by protected pages", () => {
  assert.match(settings, /studentRankVisible: true/);
  assert.match(settings, /gradesDisplayed: true/);
  assert.match(read("src/app/pending-approval/page.tsx"), /pendingApprovalContactText/);
  assert.match(read("src/app/account-disabled/page.tsx"), /disabledAccountContactText/);
  assert.match(read("src/app/student/results/page.tsx"), /studentRankVisible/);
  assert.match(read("src/app/student/batches/[batchId]/exams/[examId]/page.tsx"), /gradesDisplayed/);
});
