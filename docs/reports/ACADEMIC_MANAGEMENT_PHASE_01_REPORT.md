# Academic Management System — Phase 01 Report

## Outcome

Phase 01 establishes the additive database and TypeScript foundation for:

```text
Batch -> Subjects -> Syllabus Units -> Exams -> Results -> Progress
```

Teacher and student UI routes are intentionally unchanged in this phase.

## Database foundation

- Added `batch_subjects` for multiple subjects under one batch.
- Added `subject_units` for ordered chapters, topics, or modules.
- Added subject statuses: `DRAFT`, `UPCOMING`, `RUNNING`, `PAUSED`, `COMPLETED`, `ARCHIVED`.
- Added syllabus-unit statuses: `PLANNED`, `RUNNING`, `COMPLETED`, `SKIPPED`.
- Added `CANCELLED` to the exam workflow enum.
- Added `subject_id` to exams, materials, and announcements.
- Enforced an exam's subject and batch as a matching database pair.
- Added constraints for dates, ordering, weights, subject codes, and status transitions.
- Added RLS policies for teacher management and active-enrollment student access.

## Existing-data safety

- Every existing batch receives one default subject from the legacy `batches.subject` value.
- Every existing exam is linked to its batch's default subject.
- Existing materials and announcements are linked to the default subject while keeping future subject links optional.
- A compatibility trigger creates a default subject for batches created by the current UI.
- A compatibility trigger assigns the default subject when the current exam form omits `subject_id`.
- Existing enrollments, payments, results, materials, announcements, and student accounts are not deleted or rewritten.
- `batches.subject` remains available during the compatibility period.

## Progress foundation

Added security-invoker views:

- `subject_progress_summary`
- `batch_academic_progress`
- `student_subject_performance`

Progress is calculated from syllabus-unit weights and real exam/result states. Skipped units are excluded from the syllabus denominator, and absences remain separate from score averages.

## Application foundation

- Added strict Zod schemas for subjects and syllabus units.
- Added reusable weighted-progress, exam-journey, and student-performance utilities.
- Updated Supabase TypeScript database types for new tables, columns, views, functions, and enums.
- Added a deterministic TypeScript test runner and repaired the package lock for `npm ci` compatibility.
- Kept production `server-only` boundaries active while allowing unit tests to import shared validation modules.

## Verification completed

- Academic Phase 01 tests: 10 passed.
- Complete existing and new unit test suite: 163 passed, 0 failed.
- TypeScript: passed with `npx tsc --noEmit`.
- Changed-file ESLint: passed.
- Next.js 16.2.9 production build: passed for all 97 generated pages/routes using non-secret build placeholders.
- `npm ci --dry-run`: passed.

## Migration application

The migration is intentionally additive. Apply it through the normal Supabase migration workflow only after reviewing the dry run:

```powershell
npx supabase db push --dry-run
npx supabase db push
```

Do not create a destructive down migration after production data begins using subjects. If database rollback is ever required, restore the pre-migration database snapshot instead.

## Next phase

Phase 02 will build the teacher Academic Control Center: subject CRUD, syllabus builder, subject lifecycle controls, and true batch/subject progress management.
