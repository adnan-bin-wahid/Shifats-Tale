# Academic Management Phase 09 - Printable Student Progress Report

## Scope

This phase adds a teacher-only, read-only student progress report workflow on top of the corrected Phase 04 baseline plus Phase 06 Assignments and Phase 07 Academic Routine.

It does not add the rejected Phase 05 Attendance/Monitoring feature, and it does not add the skipped Class/Lecture Completion History feature.

## Delivered Features

- Batch to enrolled-student dependent report selector
- Student and guardian identity block
- Batch and enrollment context
- Subject-wise syllabus progress
- Completed and remaining syllabus units
- Published exam-wise marks, percentage, grade, rank, and result status
- Weighted overall exam average and performance grade
- Published assignment submission and reviewed-score summary
- Published exam remarks summary
- Blank teacher remarks and signature areas for parent meetings
- Responsive teacher preview
- Dedicated A4 browser print view
- Official downloadable PDF document
- Private no-store PDF response, rate limiting, teacher authorization, enrollment validation, and export audit log

## Routes

- `/teacher/reports/student-progress`
- `/teacher/reports/student-progress/[studentId]?batchId=[batchId]`
- `/teacher/reports/student-progress/[studentId]/print?batchId=[batchId]`
- `/api/teacher/reports/student-progress/[studentId]/pdf?batchId=[batchId]`

## Data Rules

- The selected enrollment must be `ACTIVE` or `COMPLETED`.
- Draft and archived subjects are excluded.
- Only `RESULT_PUBLISHED` exams are included.
- Only published or closed assignments are included.
- Unreviewed assignments never affect the assignment score average.
- Missing exam result rows are shown as not recorded and never silently converted into zero marks.
- Absent results never reduce the weighted exam score average.
- The report is read-only and cannot modify marks, grades, ranks, subjects, or assignments.

## Database

No migration is required. This phase reads existing Academic Management, Examination, Assignment, Enrollment, Student, and Site Settings data.

## Verification

- Phase 01-04, Phase 06, Phase 07, and Phase 09 academic tests: passed
- Full regression test suite: passed
- TypeScript: passed
- Targeted ESLint: passed
- Production build: passed
- New report routes and PDF API: confirmed in the production route manifest
- Real React-PDF render: A4, 3 pages with heavy sample data
- Poppler page rendering: verified with no clipping, overlap, broken tables, or unreadable glyphs

## Apply Notes

This package is a source overlay. Extract it over the current project only after Phase 06 and Phase 07 are already present. No `supabase db push` is required.
