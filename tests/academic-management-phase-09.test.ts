import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  calculateAssignmentReportSummary,
  calculateExamReportSummary,
  gradeFromPercentage,
} from "../src/lib/reports/student-progress-calculations";

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    "utf8"
  );
}

test("Academic Management Phase 09 - Printable Student Progress Report", async (t) => {
  await t.test("calculates recorded, absent, missing, pass, and weighted exam metrics", () => {
    const summary = calculateExamReportSummary([
      { attendanceStatus: "PRESENT", obtainedMarks: 80, totalMarks: 100, passMarks: 40 },
      { attendanceStatus: "PRESENT", obtainedMarks: 25, totalMarks: 50, passMarks: 30 },
      { attendanceStatus: "ABSENT", obtainedMarks: null, totalMarks: 100, passMarks: 40 },
      { attendanceStatus: "NOT_RECORDED", obtainedMarks: null, totalMarks: 20, passMarks: 8 },
    ]);

    assert.equal(summary.published, 4);
    assert.equal(summary.recorded, 3);
    assert.equal(summary.attended, 2);
    assert.equal(summary.absent, 1);
    assert.equal(summary.notRecorded, 1);
    assert.equal(summary.passed, 1);
    assert.equal(summary.failed, 1);
    assert.equal(summary.averagePercentage, 70);
    assert.equal(summary.grade, "A");
    assert.equal(gradeFromPercentage(32.99), "F");
  });

  await t.test("keeps unreviewed assignments out of the score average", () => {
    const summary = calculateAssignmentReportSummary([
      { status: "NOT_SUBMITTED", marksObtained: null, totalMarks: 10 },
      { status: "LATE", marksObtained: null, totalMarks: 10 },
      { status: "RETURNED", marksObtained: null, totalMarks: 10 },
      { status: "REVIEWED", marksObtained: 18, totalMarks: 20 },
    ]);

    assert.equal(summary.assigned, 4);
    assert.equal(summary.submitted, 3);
    assert.equal(summary.pending, 1);
    assert.equal(summary.reviewed, 1);
    assert.equal(summary.averagePercentage, 90);
    assert.equal(summary.submissionRate, 75);
  });

  await t.test("builds reports only from valid enrollment and published academic records", () => {
    const dataService = readProjectFile(
      "src/lib/reports/student-progress-report-data.ts"
    );
    assert.match(dataService, /\.in\("status", \["ACTIVE", "COMPLETED"\]\)/);
    assert.match(dataService, /\.eq\("status", "RESULT_PUBLISHED"\)/);
    assert.match(dataService, /\.neq\("status", "DRAFT"\)/);
    assert.match(dataService, /\.neq\("status", "ARCHIVED"\)/);
    assert.match(dataService, /academic_assignment_submissions/);
    assert.match(dataService, /calculateSyllabusProgress/);
    assert.match(dataService, /calculateExamReportSummary/);
    assert.match(dataService, /site_name/);
    assert.match(dataService, /primary_phone/);
    assert.match(dataService, /\.eq\("id", 1\)/);
    assert.doesNotMatch(dataService, /section_key|settingsResult\.data\?\.content/);
    assert.doesNotMatch(dataService, /createAdminClient/);
    assert.doesNotMatch(dataService, /\.insert\(|\.update\(|\.delete\(/);
  });

  await t.test("provides dependent batch-student selection and professional preview actions", () => {
    const builder = readProjectFile(
      "src/app/teacher/reports/student-progress/page.tsx"
    );
    const filters = readProjectFile(
      "src/components/reports/student-progress-report-filters.tsx"
    );
    const preview = readProjectFile(
      "src/app/teacher/reports/student-progress/[studentId]/page.tsx"
    );
    const reportsCenter = readProjectFile("src/app/teacher/reports/page.tsx");
    const academicReport = readProjectFile(
      "src/app/teacher/reports/academic/page.tsx"
    );
    const directory = readProjectFile(
      "src/lib/reports/student-progress-report-directory.ts"
    );

    assert.match(builder, /destination !== "TEACHER_DASHBOARD"/);
    assert.match(filters, /student\.batchId === batchId/);
    assert.match(filters, /setStudentId\(""\)/);
    assert.match(filters, /Build report/);
    assert.match(preview, /Print A4/);
    assert.match(preview, /Download PDF/);
    assert.match(reportsCenter, /\/teacher\/reports\/student-progress/);
    assert.match(academicReport, /StudentProgressReportFilters/);
    assert.match(academicReport, /Build a student progress report/);
    assert.match(directory, /student:student_profiles!inner/);
    assert.match(directory, /profile:profiles!inner/);
    assert.match(directory, /\.in\("status", \["ACTIVE", "COMPLETED"\]\)/);
  });

  await t.test("ships A4 print and authenticated audited PDF export", () => {
    const printPage = readProjectFile(
      "src/app/teacher/reports/student-progress/[studentId]/print/page.tsx"
    );
    const pdfRoute = readProjectFile(
      "src/app/api/teacher/reports/student-progress/[studentId]/pdf/route.ts"
    );
    const document = readProjectFile(
      "src/pdf/StudentProgressReportDocument.tsx"
    );

    assert.match(printPage, /@page \{ size: A4/);
    assert.match(printPage, /AutoPrintReport/);
    assert.match(pdfRoute, /requireTeacher\(\)/);
    assert.match(pdfRoute, /rateLimit/);
    assert.match(pdfRoute, /STUDENT_PROGRESS_REPORT_PDF_EXPORTED/);
    assert.match(pdfRoute, /Cache-Control": "private, no-store"/);
    assert.match(document, /Student Progress Report/);
    assert.match(document, /Teacher&apos;s Remarks/);
    assert.match(document, /Guardian Signature/);
  });

  await t.test("does not add attendance monitoring, lecture history, or a database migration", () => {
    const packageJson = readProjectFile("package.json");
    const reportCard = readProjectFile(
      "src/components/reports/student-progress-report-card.tsx"
    );
    assert.match(packageJson, /academic-management-phase-09\.test\.ts/);
    assert.doesNotMatch(reportCard, /Academic Health|Support Alert|Lecture Completion/i);
  });
});
