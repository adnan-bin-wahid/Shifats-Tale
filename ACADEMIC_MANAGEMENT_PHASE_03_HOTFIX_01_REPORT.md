# Academic Management Phase 03 — Hotfix 01

## Fixed

- Restored active batches on `/student/academics`.
- Restored authorized access to `/student/batches/[batchId]/academics`.
- Replaced the nonexistent `enrollments.enrolled_at` field with the real
  `approved_at` and `created_at` fields.
- Enrollment query failures now raise an application error instead of being
  misrepresented as an empty academic journey or an unauthorized batch.

## Root cause

The Phase 03 student pages selected and sorted by `enrolled_at`, but the
project's `enrollments` table contains `approved_at` and `created_at` instead.
Supabase returned a query error, while the overview converted the missing data
to an empty array. This caused the sidebar to show an active batch while the
Academic Journey displayed zero batches.

## Files in this overlay

- `src/app/student/academics/page.tsx`
- `src/app/student/batches/[batchId]/academics/page.tsx`
- `tests/academic-management-phase-03.test.ts`

No Supabase migration is included or required.

## Verification

- Academic Management tests: passed
- Full test suite: passed
- TypeScript (`tsc --noEmit`): passed
- Focused ESLint: passed
- Next.js 16.2.9 production build: passed

