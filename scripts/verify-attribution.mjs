#!/usr/bin/env node
/**
 * Attribution coverage guard (site side).
 *
 * Every "Start Free" link on packory.app must carry a `?source=<tag>` so a signup
 * can be attributed to the surface that produced it. The console only records one
 * tag (Packory/src/lib/auth/navigation.ts -> safeSignupSource), so a missing tag
 * means the lead lands as "unknown" in channel reporting.
 *
 * Usage:  npm run build && node scripts/verify-attribution.mjs
 * Exit 1 = invalid tag or untagged layout CTA (regression).
 *
 * Raw markdown body links (src/content/blog/*.md) are listed as "handoff" — they
 * are content-owned (Aina), not layout, and cannot be tagged at build time here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
// Same filter as the console's safeSignupSource().
const TAG_RE = /^[a-z0-9][a-z0-9:_\-./]{0,63}$/;
const SIGNUP_RE = /href="([^"]*console\.packory\.app\/signup[^"]*)"/g;
const isBlogPost = (rel) => /^\/blog\/[^/]+\/index\.html$/.test(rel);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = walk(DIST).sort();
const problems = [];
const handoff = [];
const tags = new Map();
let total = 0;
let tagged = 0;

for (const file of files) {
  const rel = '/' + relative(DIST, file);
  const html = readFileSync(file, 'utf8');
  const hrefs = [...html.matchAll(SIGNUP_RE)].map((m) => m[1].replace(/&amp;/g, '&'));
  for (const href of hrefs) {
    total++;
    const source = new URL(href).searchParams.get('source');
    if (!source) {
      if (isBlogPost(rel)) handoff.push(`${rel} -> ${href}`);
      else problems.push(`UNTAGGED  ${rel} -> ${href}`);
      continue;
    }
    tagged++;
    if (!TAG_RE.test(source)) problems.push(`TAG-FAIL  ${rel} -> "${source}"`);
    if (!tags.has(source)) tags.set(source, new Set());
    tags.get(source).add(rel);
  }
}

console.log(`pages scanned : ${files.length}`);
console.log(`signup CTAs   : ${total} (tagged ${tagged} · untagged ${total - tagged})`);
console.log(`unique tags   : ${tags.size}`);
for (const [tag, pages] of [...tags.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${TAG_RE.test(tag) ? 'PASS' : 'FAIL'}  ${tag.padEnd(56)} ${pages.size} page(s)`);
}
if (handoff.length) {
  console.log(`\nhandoff (content-owned body links, ${handoff.length}):`);
  for (const h of handoff) console.log('  ' + h);
}
if (problems.length) {
  console.log(`\nFAIL — ${problems.length} problem(s):`);
  for (const p of problems) console.log('  ' + p);
} else {
  console.log('\nOK — every layout CTA is tagged and every tag passes the console filter');
}
process.exit(problems.length ? 1 : 0);
