import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { examSchema } from "../src/lib/validations/exams";

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

test("Academic Management Phase 02", async (t) => {
  await t.test("requires every examination to be linked to a subject", () => {
    const baseExam = {
      batchId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Physics Weekly Assessment",
      examType: "WEEKLY_EXAM",
      examDate: "2026-08-02",
      totalMarks: 50,
      passMarks: 20,
    };

    assert.equal(examSchema.safeParse(baseExam).success, false);
    assert.equal(
      examSchema.safeParse({
        ...baseExam,
        subjectId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      }).success,
      true
    );
  });

  await t.test("protects academic mutations with teacher authorization and ownership checks", () => {
    const actions = readProjectFile("src/app/actions/academic-management.ts");

    assert.match(actions, /^"use server";/);
    assert.match(actions, /requireTeacher\(\)/);
    assert.match(actions, /createBatchSubjectAction/);
    assert.match(actions, /updateBatchSubjectStatusAction/);
    assert.match(actions, /createSubjectUnitAction/);
    assert.match(actions, /deleteSubjectUnitAction/);
    assert.match(actions, /batch_id/);
    assert.match(actions, /createAuditLog/);
  });

  await t.test("validates that an exam subject belongs to the selected batch", () => {
    const examActions = readProjectFile("src/app/actions/exams.ts");

    assert.match(examActions, /\.eq\("id", data\.subjectId\)/);
    assert.match(examActions, /\.eq\("batch_id", data\.batchId\)/);
    assert.match(examActions, /subject_id: data\.subjectId/);
    assert.match(examActions, /cannot be changed after student results have been entered/);
  });

  await t.test("ships the teacher overview, batch workspace, and navigation entry", () => {
    const overview = readProjectFile("src/app/teacher/academic/page.tsx");
    const workspace = readProjectFile(
      "src/app/teacher/academic/[batchId]/academic-batch-workspace.tsx"
    );
    const sidebar = readProjectFile("src/components/dashboard/teacher-sidebar.tsx");

    assert.match(overview, /Academic Control Center/);
    assert.match(workspace, /Syllabus roadmap/);
    assert.match(workspace, /Linked examinations/);
    assert.match(workspace, /createBatchSubjectAction/);
    assert.match(workspace, /createSubjectUnitAction/);
    assert.match(sidebar, /Academic Control/);
    assert.match(sidebar, /\/teacher\/academic/);
  });

  await t.test("prefills batch and subject when scheduling from the workspace", () => {
    const page = readProjectFile("src/app/teacher/exams/new/page.tsx");
    const form = readProjectFile("src/app/teacher/exams/new/new-exam-form.tsx");

    assert.match(page, /searchParams: Promise/);
    assert.match(page, /initialBatchId=\{query\.batchId\}/);
    assert.match(page, /initialSubjectId=\{query\.subjectId\}/);
    assert.match(form, /formData\.append\("subjectId", data\.subjectId\)/);
  });
});
