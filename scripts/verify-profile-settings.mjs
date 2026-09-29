import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const paths = [
  "lib/profile-settings.ts",
  "app/api/account/profile/route.ts",
  "app/api/account/profile/avatar/route.ts",
  "components/settings/ProfileSettingsForm.tsx",
  "components/dashboard/UserMenu.tsx",
  "scripts/schema.md",
];
for (const path of paths) assert.ok(existsSync(path), `missing ${path}`);

const helper = read(paths[0]);
const profileRoute = read(paths[1]);
const avatarRoute = read(paths[2]);
const form = read(paths[3]);
const menu = read(paths[4]);
const migration = read(paths[5]);

assert.match(helper, /validateUsername/);
assert.match(helper, /2 \* 1024 \* 1024/);
assert.match(helper, /image\/jpeg/);
assert.match(helper, /image\/png/);
assert.match(helper, /image\/webp/);
assert.match(helper, /\$\{userId\}\/avatar\.webp/);

for (const source of [profileRoute, avatarRoute]) {
  assert.match(source, /getCurrentUser/);
  assert.match(source, /isSameOriginMutation/);
  assert.match(source, /private, no-store/);
  assert.doesNotMatch(source, /searchParams\.get\(["']user/i);
}
assert.match(profileRoute, /LOWER\(username\) = LOWER\(\$1\)/);
assert.match(profileRoute, /withTransaction/);
assert.match(profileRoute, /account_profile_updated/);
assert.match(avatarRoute, /limitInputPixels/);
assert.match(avatarRoute, /\.resize\(512, 512/);
assert.match(avatarRoute, /\.webp\(/);
assert.match(avatarRoute, /account_profile_image_updated/);

assert.match(form, /name="username"/);
assert.match(form, /name="displayName"/);
assert.match(form, /name="avatar"/);
assert.match(form, /accept="image\/jpeg,image\/png,image\/webp"/);
assert.match(form, /aria-live="polite"/);
assert.match(menu, /\/dashboard\/settings/);
assert.match(menu, /\/api\/account\/profile\/avatar/);

assert.match(migration, /INSERT INTO storage\.buckets/);
assert.match(migration, /'profile-images'/);
assert.match(migration, /false/);
assert.match(migration, /2097152/);
assert.match(migration, /ON CONFLICT \(id\) DO UPDATE/);

console.log("Profile settings verifier passed.");
