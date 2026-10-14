// Repository guardrails. Fails (exit 1) on banned APIs, secret-like strings,
// or changed/removed test fixtures. Run: npm run check:safety
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const problems = [];
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter((f) => existsSync(f));

// 1. Banned APIs in app source (tests included: they ship patterns into habits).
const banned = [
  [/dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML'],
  [/\.(innerHTML|outerHTML)\b/, 'innerHTML/outerHTML'],
  [/insertAdjacentHTML/, 'insertAdjacentHTML'],
  [/\beval\s*\(/, 'eval('],
  [/new\s+Function\s*\(/, 'new Function('],
  [/document\.write/, 'document.write'],
  // Global alert/confirm/prompt only: `installEvent.prompt()` (SPEC §7.8) is a method and allowed.
  [
    /(?<![.\w$])(alert|confirm|prompt)\s*\(|\bwindow\.(alert|confirm|prompt)\b/,
    'alert/confirm/prompt',
  ],
  [/\b(localStorage|sessionStorage)\b/, 'localStorage/sessionStorage'],
];
for (const file of tracked.filter((f) => /^src\/.*\.(ts|tsx)$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  for (const [re, name] of banned) if (re.test(text)) problems.push(`${file}: banned API ${name}`);
}

// 2. Secret-like VALUES anywhere in the repo (names such as "service_role" in docs are fine).
const secrets = [
  /sb_secret_[A-Za-z0-9_-]{10,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{10,}/,
  /GOCSPX-[A-Za-z0-9_-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{30,}/,
];
for (const file of tracked) {
  if (file.endsWith('scripts/check-safety.mjs') || /\.(png|woff2?|otf|ico)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  for (const re of secrets)
    if (re.test(text)) problems.push(`${file}: looks like a secret (${re})`);
}
for (const file of tracked) {
  if (/(^|\/)\.env/.test(file) && !file.endsWith('.env.example'))
    problems.push(`${file}: env file must not be committed`);
  if (/sheet-music-101-(backup|saved-data)-.*\.json$/.test(file))
    problems.push(`${file}: backup and saved-data files must not be committed`);
}

// 3. Fixtures are permanent: every locked fixture must exist with the same hash.
const lockPath = 'tests/fixtures/fixtures.lock.json';
const fixtureFiles = tracked.filter((f) => /^tests\/fixtures\/.*\.json$/.test(f) && f !== lockPath);
if (fixtureFiles.length > 0 && !existsSync(lockPath))
  problems.push(`${lockPath}: missing (fixtures exist, so their lock must too)`);
if (existsSync(lockPath)) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  for (const [file, hash] of Object.entries(lock)) {
    const path = `tests/fixtures/${file}`;
    if (!existsSync(path)) problems.push(`${path}: locked fixture was removed`);
    else if (createHash('sha256').update(readFileSync(path)).digest('hex') !== hash)
      problems.push(
        `${path}: locked fixture was changed (fixtures are never edited; add a new one)`,
      );
  }
  for (const file of fixtureFiles) {
    const name = file.slice('tests/fixtures/'.length);
    if (!(name in lock)) problems.push(`${file}: fixture not in fixtures.lock.json`);
  }
}

if (problems.length) {
  console.error(`check-safety: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-safety: OK (${tracked.length} files checked)`);
