import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  assignmentReviewSchema,
  assignmentSchema,
  isValidAssignmentStatusTransition,
  studentSubmissionSchema,
} from "../src/lib/validations/assignments";

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    "utf8"
  );
}

test("Academic Management Phase 06 - Assignments", async (t) => {
  await t.test("validates academic links, deadlines, marks, and submission content", () => {
    const valid = assignmentSchema.safeParse({
      batchId: "11111111-1111-4111-8111-111111111111",
      subjectId: "22222222-2222-4222-8222-222222222222",
      unitId: "",
      title: "Vector practice",
      description: "Solve the set",
      instructions: "Show every step",
      assignmentType: "HOMEWORK",
      status: "DRAFT",
      assignedAt: "2026-07-20T10:00",
      dueAt: "2026-07-21T10:00",
      totalMarks: "20",
      allowLateSubmission: false,
      resourceUrl: "https://example.com/brief",
    });
    assert.equal(valid.success, true);

    const invalidDeadline = assignmentSchema.safeParse({
      batchId: "11111111-1111-4111-8111-111111111111",
      subjectId: "22222222-2222-4222-8222-222222222222",
      title: "Invalid",
      assignmentType: "HOMEWORK",
      status: "DRAFT",
      assignedAt: "2026-07-22T10:00",
      dueAt: "2026-07-21T10:00",
      totalMarks: 10,
      allowLateSubmission: false,
      resourceUrl: "",
    });
    assert.equal(invalidDeadline.success, false);

    assert.equal(studentSubmissionSchema.safeParse({ assignmentId: "33333333-3333-4333-8333-333333333333", submissionText: "", submissionUrl: "" }).success, false);
    assert.equal(studentSubmissionSchema.safeParse({ assignmentId: "33333333-3333-4333-8333-333333333333", submissionText: "My solution", submissionUrl: "" }).success, true);
    assert.equal(assignmentReviewSchema.safeParse({ submissionId: "44444444-4444-4444-8444-444444444444", decision: "REVIEWED", marksObtained: 8, feedback: "Good" }).success, true);
  });

  await t.test("enforces explicit assignment status transitions", () => {
    assert.equal(isValidAssignmentStatusTransition("DRAFT", "PUBLISHED"), true);
    assert.equal(isValidAssignmentStatusTransition("PUBLISHED", "CLOSED"), true);
    assert.equal(isValidAssignmentStatusTransition("CLOSED", "DRAFT"), false);
    assert.equal(isValidAssignmentStatusTransition("ARCHIVED", "PUBLISHED"), false);
  });

  await t.test("ships data integrity, least privilege grants, and RLS contracts", () => {
    const migration = readProjectFile("supabase/migrations/20260720000000_academic_management_phase_06_assignments.sql");
    assert.match(migration, /academic_assignments_subject_batch_fkey/);
    assert.match(migration, /validate_academic_assignment_submission/);
    assert.match(migration, /enrollment_row\.batch_id <> assignment_row\.batch_id/);
    assert.match(migration, /marks_obtained > assignment_row\.total_marks/);
    assert.match(migration, /protect_assignment_review_fields/);
    assert.match(migration, /auth\.role\(\) = 'service_role'/);
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
    assert.match(migration, /public\.has_active_enrollment\(batch_id\)/);
    assert.match(migration, /student_id = public\.current_student_id\(\)/);
    assert.match(migration, /GRANT INSERT \(/);
    assert.doesNotMatch(migration, /GRANT ALL/);
  });

  await t.test("authorizes every mutation and protects academic ownership", () => {
    const actions = readProjectFile("src/app/actions/assignments.ts");
    assert.match(actions, /requireTeacher\(\)/);
    assert.match(actions, /requireActiveEnrollment/);
    assert.match(actions, /validateAcademicLinks/);
    assert.match(actions, /\.eq\("batch_id", batchId\)/);
    assert.match(actions, /\.eq\("subject_id", subjectId\)/);
    assert.match(actions, /existing\?\.status === "REVIEWED"/);
    assert.match(actions, /numericMarks > Number\(assignment\.total_marks\)/);
    assert.match(actions, /createAuditLog/);
  });

  await t.test("provides teacher creation, filtering, review, and navigation", () => {
    const sidebar = readProjectFile("src/components/dashboard/teacher-sidebar.tsx");
    const list = readProjectFile("src/app/teacher/assignments/page.tsx");
    const filters = readProjectFile("src/components/assignments/assignment-filters.tsx");
    const workspace = readProjectFile("src/components/assignments/teacher-assignment-workspace.tsx");
    const academicWorkspace = readProjectFile("src/app/teacher/academic/[batchId]/academic-batch-workspace.tsx");
    assert.match(sidebar, /Assignments/);
    assert.match(sidebar, /\/teacher\/assignments/);
    assert.match(list, /Create assignment/);
    assert.match(filters, /subject\.batch_id === batchId/);
    assert.match(filters, /setSubjectId\(""\)/);
    assert.match(workspace, /Return for revision/);
    assert.match(workspace, /Publish review/);
    assert.match(academicWorkspace, /Assignments & homework/);
    assert.match(academicWorkspace, /assignments\/new\?batchId=/);
  });

  await t.test("provides a student-friendly assignment desk and secure submission UI", () => {
    const sidebar = readProjectFile("src/components/dashboard/student-sidebar.tsx");
    const dashboard = readProjectFile("src/app/student/page.tsx");
    const list = readProjectFile("src/app/student/assignments/page.tsx");
    const detail = readProjectFile("src/app/student/assignments/[assignmentId]/page.tsx");
    const form = readProjectFile("src/components/assignments/student-assignment-submission-form.tsx");
    assert.match(sidebar, /\/student\/assignments/);
    assert.match(dashboard, /Assignment desk/);
    assert.match(list, /Due in 48h/);
    assert.match(list, /My Assignments/);
    assert.match(detail, /requireActiveEnrollment/);
    assert.match(detail, /Teacher feedback/);
    assert.match(form, /submitAssignmentAction/);
    assert.match(form, /Update submission/);
  });

  await t.test("notifies students on publish and review", () => {
    const actions = readProjectFile("src/app/actions/assignments.ts");
    assert.match(actions, /ASSIGNMENT_PUBLISHED/);
    assert.match(actions, /ASSIGNMENT_REVIEWED/);
    assert.match(actions, /ASSIGNMENT_RETURNED/);
    assert.match(actions, /related_entity_type: "academic_assignments"/);
  });
});
