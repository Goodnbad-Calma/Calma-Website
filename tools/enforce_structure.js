#!/usr/bin/env node
/**
 * Calma Workspace Structure Guard
 * - Scans for HTML files and validates placement against project hierarchy
 * - Warns on misplacements; can optionally auto-move into correct folders
 * - Designed to be fast and safe; no destructive operations by default
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

// Root-relative paths
const ROOT = process.cwd();

// Project groups and canonical directories
const PROJECTS = [
  { key: 'calma-tower', name: 'حي الصحافة - شقق - Calma Tower', dir: 'projects/calma-tower' },
  { key: 'one-by-calma', name: 'مكتبي - One by Calma Tower', dir: 'projects/one-by-calma' },
  { key: 'ys200', name: 'حي الياسمين - أدوار - YS200', dir: 'projects/ys200' },
  { key: 'ys190', name: 'حي الياسمين - فلل - YS190', dir: 'projects/ys190' },
  { key: 'rm240', name: 'حي الرمال - أدوار – RM240', dir: 'projects/rm240' },
  { key: 'jn130', name: 'حي الجنادرية – أدوار – JN130', dir: 'projects/jn130' },
  { key: 'sa230', name: 'حي الصفا – أدوار - SA230', dir: 'projects/sa230' },
  { key: 'gh220', name: 'حي الغدير – تاون هاوس و أدوار - GH220', dir: 'projects/gh220' },
  { key: 'nk250', name: 'حي النخيل – تاون هاوس - NK250', dir: 'projects/nk250' },
  { key: 'ht210', name: 'حطين – فلل - HT210', dir: 'projects/ht210' },
  { key: 'ht260', name: 'حطين – تاون هاوس - HT260', dir: 'projects/ht260' },
];

const KNOWN_TOP_PAGES = new Set([
  'index.html', 'projects.html', 'about.html', 'contact.html',
  'privacy-policy.html', 'terms-of-service.html', 'cookie-policy.html',
  'brochures.html', 'factsheets.html', 'floorplans.html', 'financing-options.html',
]);

function normalize(p) { return p.replace(/\\/g, '/'); }

async function ensureDir(dir) {
  const abs = path.join(ROOT, dir);
  await fsp.mkdir(abs, { recursive: true });
  return abs;
}

async function* walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function matchProject(fileName) {
  const lower = fileName.toLowerCase();
  // heuristic mapping by slug presence
  for (const p of PROJECTS) {
    if (lower.includes(p.key) || lower.includes(p.dir.split('/').pop())) return p;
  }
  // explicit codes like GH220, NK250, etc.
  for (const p of PROJECTS) {
    const code = p.dir.split('/').pop();
    if (lower.includes(code)) return p;
  }
  return null;
}

async function main() {
  const results = [];
  const htmlCandidates = [];

  // Scan root and `en/` for loose HTML files
  for (const base of [ROOT, path.join(ROOT, 'en')]) {
    for await (const file of walk(base)) {
      if (!file.endsWith('.html')) continue;
      const rel = normalize(path.relative(ROOT, file));
      htmlCandidates.push(rel);
    }
  }

  // Validate placements
  for (const rel of htmlCandidates) {
    const dir = path.dirname(rel);
    const name = path.basename(rel);
    const isTopPage = KNOWN_TOP_PAGES.has(name) || KNOWN_TOP_PAGES.has(path.basename(rel));

    // Skip known top-level pages and localized equivalents
    if (isTopPage || dir === 'projects' || dir.startsWith('projects/')) {
      results.push({ rel, ok: true, message: 'OK' });
      continue;
    }

    // Try to infer project
    const inferred = matchProject(name) || matchProject(rel);
    if (!inferred) {
      results.push({ rel, ok: false, message: 'Unknown placement. Consider moving under an appropriate `projects/<group>/` folder.' });
      continue;
    }

    const desiredDir = inferred.dir;
    const preferred = normalize(path.join(desiredDir, name === 'index.html' ? 'index.html' : 'index.html'));
    const isInDesired = normalize(rel).startsWith(desiredDir);
    results.push({ rel, ok: isInDesired, message: isInDesired ? 'OK' : `Should be under ${desiredDir}` });
  }

  // Print a concise report
  const problems = results.filter(r => !r.ok);
  if (problems.length === 0) {
    console.log('Structure Guard: All HTML files are aligned.');
  } else {
    console.log('Structure Guard: Misplaced HTML files detected:');
    for (const p of problems) {
      console.log('-', p.rel, '→', p.message);
    }
    console.log('\nTip: Run `npm run structure:organize -- --dry=false` to auto-move safely.');
  }

  // Optional auto-move
  const argv = process.argv.slice(2);
  const auto = argv.some(a => a === '--auto' || a === '--organize');
  const dryArg = argv.find(a => a.startsWith('--dry='));
  const dry = dryArg ? dryArg.split('=')[1] !== 'false' : true;

  if (auto) {
    for (const r of results) {
      if (r.ok) continue;
      const name = path.basename(r.rel);
      const inferred = matchProject(name) || matchProject(r.rel);
      if (!inferred) continue;
      const targetDir = await ensureDir(inferred.dir);
      const target = path.join(targetDir, 'index.html');
      if (dry) {
        console.log('[dry-run] would move', r.rel, '→', normalize(path.relative(ROOT, target)));
      } else {
        const absSrc = path.join(ROOT, r.rel);
        const absDst = target;
        await fsp.rename(absSrc, absDst).catch(async () => {
          // If rename fails (cross-device), fallback to copy & remove
          const buf = await fsp.readFile(absSrc);
          await fsp.writeFile(absDst, buf);
          await fsp.unlink(absSrc);
        });
        console.log('moved', r.rel, '→', normalize(path.relative(ROOT, absDst)));
      }
    }
  }
}

main().catch(err => {
  console.error('Structure Guard Error:', err.message);
  process.exitCode = 1;
});