# Academic Management System — Phase 03

## Outcome

Phase 03 delivers the student-facing **Academic Journey** experience on top of the Phase 01 data foundation and Phase 02 teacher controls. Every student now receives a clear, responsive, and data-driven view of the subjects, syllabus coverage, examinations, and published performance inside their own active enrollments.

No new database migration is included. Phase 01 and Phase 02 must already be installed.

## New student routes

- `/student/academics` — portfolio overview across every active enrolled batch.
- `/student/batches/[batchId]/academics` — detailed interactive learning map for one authorized batch.
- Loading skeletons are included for both routes.
- `Academic Journey` is available from the desktop and mobile student navigation.

## Academic Journey overview

- Batch-wise syllabus, exam-conduction, and result-publication progress.
- Live counts for subjects, completed syllabus units, and published results.
- Next scheduled examination summary.
- Personal weighted examination average per batch where published results exist.
- Mobile-friendly batch learning cards linked to the detailed roadmap.

## Detailed batch learning map

- Three real batch gauges: syllabus coverage, exam journey, and result publication.
- Selectable subject portfolio with status, syllabus completion, unit count, and result count.
- Interactive `Overview`, `Syllabus`, and `Exams` tabs.
- Current running/planned learning unit and next scheduled assessment.
- Subject-to-subject visual comparison of syllabus progress and personal score average.
- Ordered chapter/topic/module timeline with planned, running, completed, and skipped states.
- Examination timeline with date, time, duration, marks, grading state, and published personal result.
- Personal performance snapshot with average, pass rate, attendance, missed exams, grade, and rank.

## Existing student dashboard integration

- The previous heuristic batch-progress formula was replaced with the Phase 01 database progress views.
- The batch console now displays real syllabus, exam, and result-publication progress.
- Direct links to the detailed learning map were added to the batch console and student quick actions.

## Security and privacy

- Both routes require a resolved `STUDENT_DASHBOARD` session.
- The overview reads only batches from the authenticated student's active enrollments.
- The detailed route verifies the exact student, batch, and `ACTIVE` enrollment before loading academic data.
- Draft and archived subjects are excluded.
- Only student-visible examination states are requested.
- Personal performance and results are filtered by the authenticated student ID.
- Student routes use the normal Supabase session client, never the service-role client.
- Existing RLS and `security_invoker` academic views remain the final database enforcement layer.

## Verification completed

- Academic Phase 01, 02, and 03 tests: passed.
- Full project test suite: 13 test files passed.
- TypeScript (`tsc --noEmit`): passed.
- New Phase 03 routes, interactive component, and updated sidebar focused lint: passed.
- Next.js 16.2.9 production build: passed; both student academic routes were generated successfully.

## Apply notes

1. Extract the Phase 03 overlay into the existing Phase 02 project root and allow file replacement.
2. Run `npm ci`.
3. Run `npm run test:academic`, `npm test`, and `npm run build`.
4. Do **not** run `supabase db push`; Phase 03 contains no migration.

