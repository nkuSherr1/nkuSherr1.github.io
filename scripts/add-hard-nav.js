/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Absolute repo root
const ROOT = process.cwd();

// Pages we must include at minimum regardless of link scan
const MUST_INCLUDE = [
  'index.html',
  path.join('en', 'index.html'),
  path.join('zh', 'index.html'),
  path.join('ja', 'index.html'),
  path.join('cv', 'index.html'),
  path.join('about', 'index.html'),
];

// Scan targets per instruction:
// - *.html at repo root
// - *.html in first-level folders (e.g. foo/*.html and foo/index.html)
function listHtmlFiles() {
  const rootEntries = fs.readdirSync(ROOT, { withFileTypes: true });
  const results = new Set();

  // Root-level *.html
  for (const ent of rootEntries) {
    if (ent.isFile() && ent.name.endsWith('.html')) {
      results.add(ent.name);
    }
  }

  // First-level directories: add *.html inside them
  for (const ent of rootEntries) {
    if (ent.isDirectory() && !ent.name.startsWith('.')) {
      const dirPath = path.join(ROOT, ent.name);
      try {
        const subEntries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const sub of subEntries) {
          if (sub.isFile() && sub.name.endsWith('.html')) {
            results.add(path.join(ent.name, sub.name));
          } else if (sub.isDirectory() && sub.name === 'index.html') {
            // This condition is redundant; index.html is a file, not a dir.
          }
        }
        // Also consider common convention: <dir>/index.html
        if (subEntries.some((s) => s.isFile() && s.name === 'index.html')) {
          results.add(path.join(ent.name, 'index.html'));
        }
      } catch {
        // ignore traversal errors
      }
    }
  }

  // Always include MUST_INCLUDE even if not discovered
  for (const p of MUST_INCLUDE) {
    results.add(p);
  }

  return Array.from(results);
}

function needsInjection(html) {
  if (html.includes('src="/hard-nav.js"')) return false; // already present
  // Only inject when there is a real <head> in the outer document
  // and the page links to /cv/ (per instruction) OR is one of MUST_INCLUDE
  return true;
}

function injectBeforeFirstHeadClose(html) {
  const CLOSE = '</head>';
  const idx = html.indexOf(CLOSE);
  if (idx === -1) return html; // no head found, skip
  const snippet = '<script src="/hard-nav.js"></script>';
  return html.slice(0, idx) + snippet + html.slice(idx);
}

function fileContainsCvLink(html) {
  return /href=["']\/cv\/["']/.test(html);
}

function processFile(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return;
  if (!fs.statSync(abs).isFile()) return;

  let html = fs.readFileSync(abs, 'utf8');
  // Decide whether to inject:
  const isMust = MUST_INCLUDE.some((p) => path.normalize(p) === path.normalize(relPath));
  if (!isMust) {
    // Only proceed for files that link to /cv/
    if (!fileContainsCvLink(html)) {
      return;
    }
  }
  if (!needsInjection(html)) {
    return;
  }
  const updated = injectBeforeFirstHeadClose(html);
  if (updated !== html) {
    fs.writeFileSync(abs, updated, 'utf8');
    console.log(`Injected hard-nav.js into: ${relPath}`);
  }
}

function main() {
  const files = listHtmlFiles();
  for (const f of files) {
    try {
      processFile(f);
    } catch (err) {
      console.error(`Failed to process ${f}:`, err.message);
      process.exitCode = 1;
    }
  }
}

main();

