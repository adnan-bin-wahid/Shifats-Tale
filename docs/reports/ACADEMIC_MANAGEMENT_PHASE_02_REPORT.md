# Academic Management System — Phase 02

## Outcome

Phase 02 adds a production-ready **Teacher Academic Control Center** on top of the Phase 01 database foundation. Teachers can now manage each batch's subjects, measurable syllabus units, academic statuses, and subject-linked examinations from one responsive workspace.

No new database migration is included in this phase. The Phase 01 migration `20260719000000_academic_management_phase_01.sql` must already be applied.

## New teacher experience

- `/teacher/academic` — central overview of every batch with live syllabus, subject, unit, exam, and result metrics.
- `/teacher/academic/[batchId]` — detailed batch workspace with subject navigation, progress cards, syllabus roadmap, and linked exams.
- Academic Control is available in the teacher sidebar and from an individual batch's navigation.
- Responsive loading skeletons are included for both academic routes.

## Academic operations

- Create and edit batch subjects with code, dates, theme, order, weight, and lifecycle status.
- Move subjects through `DRAFT`, `UPCOMING`, `RUNNING`, `PAUSED`, `COMPLETED`, and `ARCHIVED` using validated transitions.
- Create and edit chapters, topics, or modules with sequence, weight, schedule, notes, and status.
- Move syllabus units through `PLANNED`, `RUNNING`, `COMPLETED`, and `SKIPPED`.
- Delete syllabus units, or delete only empty non-default subjects; academic history remains protected.
- Every mutation requires an active teacher, validates server-side input, writes an audit record, and refreshes related teacher/student views.

## Examination integration

- New and edited exams must be linked to a subject in the selected batch.
- The server verifies that the subject belongs to the batch and is not archived.
- An exam cannot be moved to another batch.
- Once student results exist, the exam's subject is locked to preserve result history.
- Scheduling from a subject workspace preselects both batch and subject.
- Exam status/result actions refresh the academic progress workspace automatically.

## Verification completed

- Academic Phase 01 + Phase 02 tests: passed.
- Full project test suite: passed.
- TypeScript (`tsc --noEmit`): passed.
- Phase 02 UI/action lint scope: passed.
- Next.js 16.2.9 production build: passed; both academic routes were generated successfully.

The repository's pre-existing full-project ESLint backlog is outside this overlay; all new Phase 02 files and directly updated UI files pass the focused lint check.

## Apply notes

1. Extract the Phase 02 overlay into the existing project root and allow file replacement.
2. Run `npm ci`.
3. Run `npm run test:academic`, `npm test`, and `npm run build`.
4. Do **not** run `supabase db push` for Phase 02; it contains no migration.

