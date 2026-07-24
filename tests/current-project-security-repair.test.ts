import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Current project security repair", async (t) => {
  await t.test("never substitutes a mock teacher for the authenticated session", () => {
    const source = read("src/lib/supabase/auth.ts");

    assert.match(source, /return resolveUserDestination\(supabase\);/);
    assert.doesNotMatch(source, /profile:\s*\{\s*id:\s*"mock"/);
    assert.doesNotMatch(source, /teacher@test\.com/);
  });

  await t.test("centralizes legacy teacher-action authorization", () => {
    const teacherOnlyActionFiles = [
      "src/app/actions/teacher.ts",
      "src/app/actions/payments.ts",
      "src/app/actions/exams.ts",
      "src/app/actions/materials.ts",
      "src/app/actions/announcements.ts",
    ];

    for (const path of teacherOnlyActionFiles) {
      const source = read(path);
      assert.match(source, /import \{ requireTeacher \} from "@\/lib\/auth-guards";/);
      assert.match(source, /await requireTeacher\(\)/);
      assert.doesNotMatch(source, /resolveAuthenticatedDestination/);
    }

    const profileActions = read("src/app/actions/profiles.ts");
    assert.match(profileActions, /const \{ profile \} = await requireTeacher\(\);/);
    assert.match(
      profileActions,
      /const \{ profile: teacher \} = await requireTeacher\(\);/
    );
  });

  await t.test("keeps public CMS reads out of the service-role client", () => {
    const source = read(
      "src/features/website-cms/actions/content-actions.ts"
    );

    assert.doesNotMatch(source, /createAdminClient/);
    assert.match(source, /\.from\("vw_public_site_page_sections"\)/);
    assert.match(source, /\.eq\("page_key", pageKey\)/);
    assert.match(source, /\.eq\("section_key", sectionKey\)/);
    assert.match(source, /\.from\("vw_public_site_section_items"\)/);
    assert.match(source, /\.from\("vw_public_media_assets"\)/);
  });

  await t.test("ships the public-view migration required by the CMS repair", () => {
    const migration = read(
      "supabase/migrations/20260724000000_current_project_security_repair.sql"
    );

    assert.match(migration, /WITH \(security_barrier = true\)/);
    assert.match(migration, /p\.page_key/);
    assert.match(migration, /i\.metadata/);
    assert.match(
      migration,
      /GRANT SELECT ON public\.vw_public_site_page_sections TO anon, authenticated;/
    );
    assert.match(
      migration,
      /GRANT SELECT ON public\.vw_public_site_section_items TO anon, authenticated;/
    );
  });

  await t.test("does not query database objects absent from the supplied schema", () => {
    const source = [
      "src/app/actions/profiles.ts",
      "src/app/actions/teacher.ts",
      "src/app/actions/exams.ts",
    ]
      .map(read)
      .join("\n");

    assert.doesNotMatch(source, /\.from\("attendance"\)/);
    assert.doesNotMatch(source, /recipient_profile_id/);
    assert.match(
      source,
      /\.from\("notifications"\)\.delete\(\)\.eq\("user_id", profileId\)/
    );
  });
});
