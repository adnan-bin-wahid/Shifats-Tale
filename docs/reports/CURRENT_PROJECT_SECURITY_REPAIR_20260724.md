# Current Project Security Repair — 2026-07-24

## Scope

This patch repairs the current Shifat's Tales project without changing its
approved UI flows, academic calculations, or feature behavior.

## Repairs

- Replaced the hard-coded mock-teacher authentication result with the real
  Supabase session/profile resolver.
- Routed legacy teacher-only batch, payment, exam, material, announcement, and
  profile mutations through the centralized `requireTeacher()` guard.
- Removed public CMS reads through the service-role client.
- Scoped public page-section reads by both `pageKey` and `sectionKey`.
- Added a migration that exposes only published CMS data through hardened public
  views, including public presentation metadata.
- Removed queries to the nonexistent `attendance` table and the nonexistent
  `notifications.recipient_profile_id` column.
- Corrected delete-confirmation copy so displayed table names match the supplied
  schema.
- Added regression coverage for the production auth wrapper, legacy teacher
  guards, CMS public-read boundary, migration contract, and schema references.

## Verification

- `npm test`: passed (19 test files)
- `npx tsc --noEmit`: passed
- `npm run build`: passed for all 108 routes with non-secret build-verification
  environment placeholders
- ZIP integrity: must be checked after packaging

The repository's pre-existing project-wide ESLint debt is not part of this
bounded security repair. No lint rules were disabled or weakened.

## Database

Apply this additive migration:

```text
supabase/migrations/20260724000000_current_project_security_repair.sql
```

Run `npx supabase db push --dry-run` before the real push. Do not run
`supabase migration repair` for this patch.
