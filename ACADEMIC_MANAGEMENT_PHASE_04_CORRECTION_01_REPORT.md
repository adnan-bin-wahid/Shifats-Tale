# Academic Management Phase 04 — Correction 01

## Outcome

This correction removes subject-wise announcements, exposes Academic Reports in the teacher navigation, and repairs the dependent batch/subject filters introduced in Phase 04.

## Corrections

### 1. Announcements are batch-level only

- Removed the subject selector and subject filter from the teacher announcement workspace.
- Removed subject announcement shortcuts and counters from teacher and student academic subject cards.
- Student announcements now show the active published announcements for the enrolled batch.
- Announcement create/update actions always persist `subject_id: null`.
- Existing announcement status, release, expiry, notification, audit, edit, archive, and delete behavior remains intact.

### 2. Academic Reports are discoverable

- Added **Academic Reports** to the teacher sidebar.
- Added an **Academic Reports** button to Academic Control.
- Direct route: `/teacher/reports/academic`.

### 3. Filters work as dependent filters

- Report subjects now update when the selected batch changes.
- A subject from another batch is automatically cleared.
- Invalid URL filter values are safely ignored.
- Added Apply and Clear actions to the report filter bar.
- Global teacher materials load the complete subject directory, including subjects with no material yet.
- Batch-scoped material pages expose only their current batch and cannot switch into an unloaded batch.
- Teacher material subject choices cascade from the batch choice.
- Added a full material filter reset and live result count.
- Corrected the Released filter so it means published, released, and not expired.
- Student material subject choices come from the batch subject directory and accept only valid URL filters.

## Verification

- TypeScript: passed (`tsc --noEmit`).
- Focused ESLint on all correction files: passed.
- Full project test suite: passed.
- Academic Phase 01–04 test suite: passed (33 assertions).
- Next.js 16.2.9 production build: passed.

## Deployment

Apply this ZIP as a source overlay, then run:

```powershell
npm run test:academic
npm run build
```

No Supabase migration or `supabase db push` is required for this correction.
