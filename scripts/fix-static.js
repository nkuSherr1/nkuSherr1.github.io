/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const targets = [
  'cv/index.html',
  'about/index.html',
  'en/cv/index.html',
  'en/about/index.html',
  'zh/cv/index.html',
  'zh/about/index.html',
];

function replaceSpinnerWithArticle(html) {
  // 1) Prepare patterns
  // Pattern: <!--$?--><template id="B:0"></template><div ...>...Loading…...</div><!--/$-->
  const spinnerPattern =
    /<!--\$\?-->\s*<template\s+id="B:0"><\/template>\s*<div[^>]*?>[\s\S]*?<\/div>\s*<!--\/\$\s*-->/;
  const s0Pattern =
    /<div\s+hidden\s+id="S:0">\s*(<article\s+class="about-page"[\s\S]*?<\/article>)\s*<!--\$\s*-->\s*<!--\/\$\s*-->\s*<\/div>/;

  let updated = html;

  const hasSpinner = spinnerPattern.test(updated);
  const articleMatch = updated.match(s0Pattern);

  // 2) Replace the suspense block with article when both are present
  if (hasSpinner && articleMatch) {
    const articleHTML = articleMatch[1];
    updated = updated.replace(spinnerPattern, articleHTML);
  } else if (hasSpinner && !articleMatch) {
    // spinner present but no article available to inject
    throw new Error('Failed to locate hidden #S:0 article block.');
  }

  // 3) Remove the hidden #S:0 block entirely to avoid duplicates
  updated = updated.replace(/<div\s+hidden\s+id="S:0">[\s\S]*?<\/div>\s*/g, '');

  // 4) Remove page-detail and error-related scripts from the head (only those pages)
  //    - app/%5Blocale%5D/(page-detail)/**.js
  //    - app/global-error-*.js
  //    - app/%5Blocale%5D/error-*.js
  const scriptPatterns = [
    /<script[^>]+src="\/_next\/static\/chunks\/app\/%5Blocale%5D\/\(page-detail\)\/%5Bslug%5D\/page-[^"]+\.js"[^>]*><\/script>/g,
    /<script[^>]+src="\/_next\/static\/chunks\/app\/%5Blocale%5D\/\(page-detail\)\/loading-[^"]+\.js"[^>]*><\/script>/g,
    /<script[^>]+src="\/_next\/static\/chunks\/app\/%5Blocale%5D\/\(page-detail\)\/[^"]+\.js"[^>]*><\/script>/g, // any other page-detail chunk
    /<script[^>]+src="\/_next\/static\/chunks\/app\/global-error-[^"]+\.js"[^>]*><\/script>/g,
    /<script[^>]+src="\/_next\/static\/chunks\/app\/%5Blocale%5D\/error-[^"]+\.js"[^>]*><\/script>/g,
    // explicit file names mentioned by user (idempotent)
    /<script[^>]+src="[^"]*page-a2ed7538ad56972f\.js"[^>]*><\/script>/g,
    /<script[^>]+src="[^"]*global-error-8dba986051b155a7\.js"[^>]*><\/script>/g,
    /<script[^>]+src="[^"]*error-4feb5ad20280ae9d\.js"[^>]*><\/script>/g,
  ];
  for (const p of scriptPatterns) {
    updated = updated.replace(p, '');
  }

  // 4.1) Remove ALL remaining <script src="/_next..."> tags (leave CSS <link> intact)
  updated = updated.replace(
    /<script[^>]+src="\/_next[^"]+"[^>]*><\/script>/g,
    ''
  );

  // 4.2) Remove inline Next flight/runtime scripts
  // - self.__next_f.push, self.__next_r, $RT=performance
  updated = updated.replace(
    /<script>([\s\S]*?)<\/script>/g,
    (match, inner) => {
      if (
        inner.includes('self.__next_f.push') ||
        inner.includes('self.__next_r') ||
        /\$RT\s*=/.test(inner)
      ) {
        return '';
      }
      return match;
    }
  );

  // 5) Ensure no visible spinner remains inside <main> (ignore i18n JSON)
  // Remove the known spinner container if it still exists.
  updated = updated.replace(
    /<div[^>]+data-hide-print="true"[^>]*class="[^"]*\bmy-20\b[^"]*"[^>]*>[\s\S]*?<\/div>/g,
    ''
  );

  return updated;
}

function processFile(relPath) {
  const absPath = path.join(process.cwd(), relPath);
  const original = fs.readFileSync(absPath, 'utf8');
  const updated = replaceSpinnerWithArticle(original);

  // Basic assertions
  // Ensure the spinner block is gone
  if (
    /<!--\$\?-->\s*<template\s+id="B:0"><\/template>\s*<div[^>]*?>[\s\S]*?<\/div>\s*<!--\/\$\s*-->/.test(
      updated
    )
  ) {
    throw new Error(`Suspense Loading block still present in ${relPath}`);
  }
  if (/id="S:0"/.test(updated)) {
    throw new Error(`#S:0 still present after removal in ${relPath}`);
  }
  // Keep window.__ENV and key article content checks
  if (!/window\.__ENV=/.test(updated)) {
    throw new Error(`window.__ENV missing in ${relPath}`);
  }
  // For CV pages, ensure the expected content remains
  if (/\/cv\/index\.html$/.test(relPath)) {
    if (!/Spring 2026/.test(updated)) {
      throw new Error(`Spring 2026 text missing in ${relPath}`);
    }
    if (!/Meritorious Winner, May 2026/.test(updated)) {
      throw new Error(
        `Meritorious Winner May 2026 text missing in ${relPath}`
      );
    }
    if (!/Honorable Mention, May 2025/.test(updated)) {
      throw new Error(
        `Honorable Mention May 2025 text missing in ${relPath}`
      );
    }
  }

  fs.writeFileSync(absPath, updated, 'utf8');
  console.log(`Updated: ${relPath}`);
}

function main() {
  for (const t of targets) {
    try {
      processFile(t);
    } catch (err) {
      console.error(`Failed on ${t}:`, err.message);
      process.exitCode = 1;
    }
  }
}

main();

