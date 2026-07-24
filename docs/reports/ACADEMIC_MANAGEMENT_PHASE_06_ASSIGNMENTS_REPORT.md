# Academic Management Phase 06 — Assignments & Homework

## Outcome

Phase 06 adds a complete subject-linked assignment workflow for teachers and students. It is based on the corrected Phase 04 academic system and does not include the rejected attendance or academic monitoring module.

## Teacher workflow

- Create homework, classwork, practice tasks, and projects.
- Link every assignment to a batch, subject, and optional syllabus unit.
- Configure release time, deadline, marks, supporting link, late policy, and publishing status.
- Filter assignments by keyword, batch, subject, and status with dependent batch/subject options.
- View submission completion, pending review, and reviewed counts.
- Read student text/link submissions.
- Publish marks and feedback or return a submission for revision.
- Students receive notifications when work is published, reviewed, or returned.
- Assignment create/update/status/review operations are written to audit logs.

## Student workflow

- Dedicated assignment desk with upcoming, urgent, submitted, and reviewed metrics.
- Assignment spotlight on the main student dashboard.
- Clear batch, subject, unit, deadline, total marks, and late-policy context.
- Submit an answer as text, a link, or both.
- Update work until it is reviewed or the assignment closes.
- See late, returned, reviewed, and overdue states clearly.
- Read teacher feedback and awarded marks.

## Routes

### Teacher

- `/teacher/assignments`
- `/teacher/assignments/new`
- `/teacher/assignments/[assignmentId]`
- `/teacher/assignments/[assignmentId]/edit`

### Student

- `/student/assignments`
- `/student/assignments/[assignmentId]`

The feature is also linked from both sidebars, Teacher Academic Control, each subject workspace, and the student dashboard.

## Database and security

Migration: `20260720000000_academic_management_phase_06_assignments.sql`

It creates:

- `academic_assignments`
- `academic_assignment_submissions`
- assignment and submission workflow enums
- batch/subject/unit integrity checks
- enrollment/student/assignment integrity checks
- deadline and marks validation triggers
- reviewed-submission locks
- Row Level Security policies
- column-level student write privileges that keep grading fields teacher-only

Student reads require an active enrollment and a published/closed visible assignment. Every server mutation also repeats authentication, authorization, and ownership checks.

## Apply and verify

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run test:academic
npm run build
```

Expected new migration:

```text
20260720000000_academic_management_phase_06_assignments.sql
```

## Manual acceptance checklist

1. Open `/teacher/assignments/new` and create a draft.
2. Confirm changing the batch limits the subject dropdown to that batch.
3. Publish the assignment and verify it appears in `/student/assignments` for an actively enrolled student.
4. Submit text or a link from the student page.
5. Open the teacher assignment detail and publish marks/feedback.
6. Confirm the student sees the reviewed score and can no longer edit it.
7. Return another submission and confirm the student can revise and resubmit it.
8. Test an expired assignment with late submissions both disabled and enabled.
