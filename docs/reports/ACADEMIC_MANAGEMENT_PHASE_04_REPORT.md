# Academic Management Phase 04 — Materials, Reports & Polish

## Outcome

Phase 04 connects the academic subject model to day-to-day learning resources and adds a professional, read-only academic intelligence report for teachers.

## Delivered

- Subject-wise study materials with teacher create/edit/filter workflows.
- Subject-wise announcements with teacher publishing and filtering workflows.
- Server-side verification that a selected subject belongs to the selected batch and is not archived.
- Teacher academic workspace resource cards with published/total material and announcement counts.
- Student Academic Journey resource cards for each subject.
- Student material and announcement pages with subject filters and safe visibility-window queries.
- Teacher Subject Performance report with:
  - syllabus progress;
  - exam-plan progress;
  - cohort average;
  - pass rate;
  - published-result student breakdown;
  - batch and subject filters.
- Shared loading skeletons, route error boundaries, retry support, improved empty states, keyboard Escape support, semantic dialogs, and subject filter accessibility.
- Explicit database projections and database-side release/expiry filtering to reduce unnecessary payload and client work.
- Fixed image previews so image materials no longer open in the PDF viewer.

## Security and compatibility

- Existing exam marks, grade, pass/fail, result publication, and rank calculations were not changed.
- The performance report is read-only and uses `subject_progress_summary` and `student_subject_performance`.
- Student data access continues through the authenticated Supabase client and existing RLS policies.
- No new database migration is required for Phase 04. The Phase 01 schema already contains subject links and supporting indexes for materials and announcements.

## Verification

- `npm run test:academic` — passed.
- `npm test` — passed.
- `npx tsc --noEmit` — passed.
- Focused ESLint for every Phase 04 UI, route, and test file — passed with zero errors and zero warnings.
- `npm run build` was attempted in the delivery workspace, but the execution environment stopped the command at its usage-limit gate before compilation. Run the included build command locally after applying the package.

## Apply and verify

This ZIP is an overlay package. Extract it into the existing Shifat's Tales project root, then run:

```powershell
npm run test:academic
npm test
npx tsc --noEmit
npm run build
```

No `supabase db push` command is needed for this phase.
