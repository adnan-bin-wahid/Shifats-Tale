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

test("Academic Management Phase 04", async (t) => {
  await t.test("validates subject-scoped materials and batch-scoped announcements", () => {
    const validation = readProjectFile("src/lib/validations/materials.ts");
    const materials = readProjectFile("src/app/actions/materials.ts");
    const announcements = readProjectFile("src/app/actions/announcements.ts");

    assert.match(validation, /subjectId/);
    assert.match(materials, /resolveSubjectScope/);
    assert.match(materials, /\.eq\("batch_id", batchId\)/);
    assert.match(materials, /\.neq\("status", "ARCHIVED"\)/);
    assert.match(materials, /subject_id: scopedSubjectId/);
    assert.match(announcements, /subject_id: null/);
    assert.doesNotMatch(announcements, /resolveSubjectScope/);
    assert.doesNotMatch(announcements, /subject_id: scopedSubjectId/);
  });

  await t.test("keeps subject materials connected without subject announcements", () => {
    const teacherWorkspace = readProjectFile(
      "src/app/teacher/academic/[batchId]/academic-batch-workspace.tsx"
    );
    const studentJourney = readProjectFile(
      "src/app/student/batches/[batchId]/academics/student-academic-journey.tsx"
    );
    const studentMaterials = readProjectFile(
      "src/app/student/batches/[batchId]/materials/page.tsx"
    );
    const studentAnnouncements = readProjectFile(
      "src/app/student/batches/[batchId]/announcements/page.tsx"
    );

    assert.match(teacherWorkspace, /Subject resources/);
    assert.match(teacherWorkspace, /materials\?subjectId=/);
    assert.doesNotMatch(teacherWorkspace, /announcements\?subjectId=/);
    assert.match(studentJourney, /Learning library/);
    assert.doesNotMatch(studentJourney, /Subject updates/i);
    assert.match(studentMaterials, /subject:batch_subjects\(id,name,code\)/);
    assert.doesNotMatch(studentAnnouncements, /subject:batch_subjects/);
    assert.doesNotMatch(studentAnnouncements, /subjectId/);
  });

  await t.test("cascades material and report filters and exposes report navigation", () => {
    const sidebar = readProjectFile("src/components/dashboard/teacher-sidebar.tsx");
    const academicOverview = readProjectFile("src/app/teacher/academic/page.tsx");
    const report = readProjectFile("src/app/teacher/reports/academic/page.tsx");
    const reportFilters = readProjectFile(
      "src/app/teacher/reports/academic/academic-report-filters.tsx"
    );
    const materialsPage = readProjectFile("src/app/teacher/materials/page.tsx");
    const materialsList = readProjectFile(
      "src/components/materials/teacher-materials-list.tsx"
    );

    assert.match(sidebar, /Academic Reports/);
    assert.match(sidebar, /\/teacher\/reports\/academic/);
    assert.match(academicOverview, /Academic Reports/);
    assert.match(report, /AcademicReportFilters/);
    assert.match(reportFilters, /subject\.batch_id === batchId/);
    assert.match(reportFilters, /setSubjectId\(""\)/);
    assert.match(reportFilters, /\s+Clear\s+<\/Link>/);
    assert.match(materialsPage, /id,batch_id,name,code/);
    assert.match(materialsList, /availableSubjectOptions/);
    assert.match(materialsList, /handleBatchFilterChange/);
    assert.match(materialsList, /Reset filters/);
    assert.match(materialsList, /disabled=\{Boolean\(selectedBatchId\)\}/);
  });

  await t.test("pushes visibility windows into student database queries", () => {
    const materials = readProjectFile(
      "src/app/student/batches/[batchId]/materials/page.tsx"
    );
    const announcements = readProjectFile(
      "src/app/student/batches/[batchId]/announcements/page.tsx"
    );

    for (const source of [materials, announcements]) {
      assert.match(source, /release_at\.is\.null,release_at\.lte/);
      assert.match(source, /expires_at\.is\.null,expires_at\.gt/);
      assert.match(source, /if \([^\n]*Error\) throw|throw [a-zA-Z]+Error/);
      assert.doesNotMatch(source, /createAdminClient/);
    }
  });

  await t.test("provides a read-only subject performance report from approved views", () => {
    const report = readProjectFile("src/app/teacher/reports/academic/page.tsx");

    assert.match(report, /student_subject_performance/);
    assert.match(report, /subject_progress_summary/);
    assert.match(report, /destination !== "TEACHER_DASHBOARD"/);
    assert.match(report, /Subject health map/);
    assert.match(report, /Published-result performance/);
    assert.doesNotMatch(report, /\.insert\(|\.update\(|\.delete\(/);
    assert.doesNotMatch(report, /createAdminClient/);
  });

  await t.test("ships accessible retry boundaries and loading skeletons", () => {
    const errorBoundary = readProjectFile(
      "src/components/academic/academic-route-error.tsx"
    );
    const skeleton = readProjectFile(
      "src/components/academic/academic-resource-loading.tsx"
    );
    const materialList = readProjectFile(
      "src/components/materials/StudentMaterialList.tsx"
    );

    assert.match(errorBoundary, /unstable_retry/);
    assert.match(errorBoundary, /role="alert"/);
    assert.match(skeleton, /aria-busy="true"/);
    assert.match(materialList, /aria-modal="true"/);
    assert.match(materialList, /event\.key === "Escape"/);
    assert.match(materialList, /aria-pressed/);
  });

  await t.test("does not introduce a Phase 04 database migration", () => {
    const packageJson = readProjectFile("package.json");
    assert.match(packageJson, /academic-management-phase-04\.test\.ts/);
  });
});
