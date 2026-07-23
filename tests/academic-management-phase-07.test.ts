import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  classSessionSchema,
  isValidClassSessionStatusTransition,
} from "../src/lib/validations/class-routine";

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    "utf8"
  );
}

test("Academic Management Phase 07 - Subject-linked Class Routine", async (t) => {
  await t.test("validates academic links, time order, duration, and URLs", () => {
    const valid = classSessionSchema.safeParse({
      batchId: "11111111-1111-4111-8111-111111111111",
      subjectId: "22222222-2222-4222-8222-222222222222",
      unitId: "",
      title: "Vector resolution",
      sessionType: "REGULAR",
      status: "SCHEDULED",
      startsAt: "2026-07-22T17:00",
      endsAt: "2026-07-22T18:30",
      location: "Room 301",
      classLink: "https://example.com/live",
      studentNote: "Bring the practice book.",
    });
    assert.equal(valid.success, true);

    const invalidTime = classSessionSchema.safeParse({
      batchId: "11111111-1111-4111-8111-111111111111",
      subjectId: "22222222-2222-4222-8222-222222222222",
      title: "Invalid",
      sessionType: "REGULAR",
      status: "SCHEDULED",
      startsAt: "2026-07-22T18:30",
      endsAt: "2026-07-22T17:00",
      classLink: "",
    });
    assert.equal(invalidTime.success, false);

    const invalidLink = classSessionSchema.safeParse({
      batchId: "11111111-1111-4111-8111-111111111111",
      subjectId: "22222222-2222-4222-8222-222222222222",
      title: "Invalid link",
      sessionType: "REGULAR",
      status: "SCHEDULED",
      startsAt: "2026-07-22T17:00",
      endsAt: "2026-07-22T18:30",
      classLink: "javascript:alert(1)",
    });
    assert.equal(invalidLink.success, false);
  });

  await t.test("enforces reversible but explicit session status transitions", () => {
    assert.equal(isValidClassSessionStatusTransition("SCHEDULED", "COMPLETED"), true);
    assert.equal(isValidClassSessionStatusTransition("SCHEDULED", "CANCELLED"), true);
    assert.equal(isValidClassSessionStatusTransition("COMPLETED", "SCHEDULED"), true);
    assert.equal(isValidClassSessionStatusTransition("COMPLETED", "CANCELLED"), false);
  });

  await t.test("ships link integrity, overlap prevention, RLS, and least privilege", () => {
    const migration = readProjectFile("supabase/migrations/20260721000000_academic_management_phase_07_class_routine.sql");
    assert.match(migration, /academic_class_sessions_subject_batch_fkey/);
    assert.match(migration, /unit_subject_id <> NEW\.subject_id/);
    assert.match(migration, /tstzrange\(session_row\.starts_at, session_row\.ends_at, '\[\)'\)/);
    assert.match(migration, /This batch already has a class during the selected time/);
    assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
    assert.match(migration, /public\.has_active_enrollment\(batch_id\)/);
    assert.match(migration, /public\.is_active_teacher\(\)/);
    assert.match(migration, /REVOKE ALL ON public\.academic_class_sessions FROM anon/);
    assert.doesNotMatch(migration, /GRANT ALL/);
  });

  await t.test("authorizes mutations, verifies academic ownership, notifies, and audits", () => {
    const actions = readProjectFile("src/app/actions/class-routine.ts");
    assert.match(actions, /requireTeacher\(\)/);
    assert.match(actions, /validateAcademicLinks/);
    assert.match(actions, /\.eq\("batch_id", batchId\)/);
    assert.match(actions, /\.eq\("subject_id", subjectId\)/);
    assert.match(actions, /ACADEMIC_CLASS_SESSION_CREATED/);
    assert.match(actions, /ACADEMIC_CLASS_SESSION_UPDATED/);
    assert.match(actions, /ACADEMIC_CLASS_SESSION_STATUS_CHANGED/);
    assert.match(actions, /related_entity_type: "academic_class_sessions"/);
    assert.match(actions, /createAuditLog/);
  });

  await t.test("provides teacher planning, dependent filters, and academic shortcuts", () => {
    const sidebar = readProjectFile("src/components/dashboard/teacher-sidebar.tsx");
    const list = readProjectFile("src/app/teacher/routine/page.tsx");
    const form = readProjectFile("src/components/class-routine/class-session-form.tsx");
    const filters = readProjectFile("src/components/class-routine/routine-filters.tsx");
    const workspace = readProjectFile("src/app/teacher/academic/[batchId]/academic-batch-workspace.tsx");
    assert.match(sidebar, /Academic Routine/);
    assert.match(sidebar, /\/teacher\/routine/);
    assert.match(list, /Schedule class/);
    assert.match(form, /subject\.batch_id === batchId/);
    assert.match(form, /unit\.subject_id === subjectId/);
    assert.match(filters, /setSubjectId\(""\)/);
    assert.match(workspace, /Subject-linked class routine/);
    assert.match(workspace, /routine\/new\?batchId=/);
  });

  await t.test("shows only active-enrollment routine data to students", () => {
    const sidebar = readProjectFile("src/components/dashboard/student-sidebar.tsx");
    const page = readProjectFile("src/app/student/routine/page.tsx");
    const journey = readProjectFile("src/app/student/batches/[batchId]/academics/student-academic-journey.tsx");
    assert.match(sidebar, /\/student\/routine/);
    assert.match(page, /\.eq\("student_id", studentProfile\.id\)/);
    assert.match(page, /\.eq\("status", "ACTIVE"\)/);
    assert.match(page, /\.in\("batch_id", batchIds\)/);
    assert.match(page, /Personal class timeline/);
    assert.match(page, /Academic journey/);
    assert.match(journey, /Open class routine/);
  });

  await t.test("keeps the existing public routine flyer CMS separate", () => {
    const publicRoutine = readProjectFile("src/app/(public)/class-routine/ClassRoutineClient.tsx");
    const cmsRoutine = readProjectFile("src/app/teacher/website/class-routine/page.tsx");
    assert.match(publicRoutine, /routineImageSrc/);
    assert.match(publicRoutine, /Click to enlarge full routine/);
    assert.match(cmsRoutine, /Routine Flyer/);
    assert.doesNotMatch(publicRoutine, /academic_class_sessions/);
  });
});
