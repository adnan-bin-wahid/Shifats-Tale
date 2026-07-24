# Academic Management Phase 09 - Correction 01

## Fixed

- Added the batch-to-student progress-report selector directly to `/teacher/reports/academic`.
- Reused one server-side enrollment directory for both Academic Reports and the dedicated report builder.
- Restricted report choices to valid `ACTIVE` or `COMPLETED` enrollments.
- Required inner student/profile relationships so blank directory rows are excluded.
- Corrected the progress-report branding query to match the real `site_settings` schema.
- Removed invalid reads of non-existent `content` and `section_key` columns.
- Kept preview, A4 print, and PDF generation on the same corrected report data service.

## Database

No migration is required.

## Verification

- Academic regression tests: passed
- Full regression test suite: passed
- TypeScript: passed
- Targeted ESLint: passed
- Production build: passed
- Teacher academic, progress preview, print, and PDF routes confirmed
