import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = ["index.html", "character-translation/index.html", "chat/index.html"];
const scriptFiles = [
  "static/js/index.js",
  "character-translation/static/js/index.js",
  "character-translation/static/js/site-data.js",
  "chat/static/js/index.js",
];
const requiredFiles = [
  ".nojekyll",
  "robots.txt",
  "sitemap.xml",
  "static/css/index.css",
  "static/images/favicon.svg",
  "static/images/social-preview.svg",
  "character-translation/static/css/index.css",
  "character-translation/static/images/experiment-overview.svg",
  "character-translation/static/images/social-preview.png",
  "chat/static/css/index.css",
  "chat/static/images/favicon.svg",
  "chat/static/images/system-map.svg",
  "chat/static/images/knowledge-map.svg",
  "chat/static/images/social-preview.svg",
  ...htmlFiles,
  ...scriptFiles,
];
const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`Missing required file: ${file}`);
}

for (const script of scriptFiles) {
  if (!existsSync(resolve(root, script))) continue;
  try {
    execFileSync(process.execPath, ["--check", resolve(root, script)], { stdio: "pipe" });
  } catch (error) {
    failures.push(`${script} is not valid JavaScript: ${error.stderr?.toString().trim() || error.message}`);
  }
}

for (const htmlFile of htmlFiles) {
  const absoluteHtml = resolve(root, htmlFile);
  if (!existsSync(absoluteHtml)) continue;
  const html = readFileSync(absoluteHtml, "utf8");
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));

  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.has(match[1])) failures.push(`${htmlFile} links to a missing fragment: #${match[1]}`);
  }

  const localReferences = [...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|mailto:|tel:|data:)/i.test(reference));

  for (const reference of localReferences) {
    const pathOnly = reference.split(/[?#]/, 1)[0];
    if (!pathOnly) continue;
    const target = resolve(dirname(absoluteHtml), pathOnly);
    if (!existsSync(target)) failures.push(`${htmlFile} references a missing local path: ${reference}`);
  }

  if (!html.includes('name="viewport"')) failures.push(`${htmlFile} is missing a viewport meta tag.`);
  if (!html.includes("skip-link")) failures.push(`${htmlFile} is missing a keyboard skip link.`);
  if (!/<html\s+lang="[^"]+"/i.test(html)) failures.push(`${htmlFile} is missing a document language.`);
}

const publicTextFiles = requiredFiles.filter((file) => [".html", ".css", ".js", ".svg", ".xml", ".txt"].includes(extname(file)));
const forbiddenPatterns = [
  [/[\uAC00-\uD7AF]/u, "Korean text in the English-only public site"],
  [/\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]+\b/, "GitHub token"],
  [/\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"']+["']/i, "possible secret"],
  [/\b(?:127\.0\.0\.1|localhost)(?::\d+)?\b/i, "loopback address"],
  [/\b100\.(?:\d{1,3}\.){2}\d{1,3}\b/, "private overlay IP"],
  [/\.ts\.net\b/i, "private overlay hostname"],
];

for (const file of publicTextFiles) {
  const absolute = resolve(root, file);
  if (!existsSync(absolute)) continue;
  const contents = readFileSync(absolute, "utf8");
  for (const [pattern, label] of forbiddenPatterns) {
    if (pattern.test(contents)) failures.push(`${file} contains a forbidden ${label}.`);
  }
}

try {
  execFileSync(process.execPath, [resolve(root, "character-translation/scripts/check-site.mjs")], {
    cwd: resolve(root, "character-translation"),
    stdio: "pipe",
  });
} catch (error) {
  failures.push(`Character translation validation failed: ${error.stderr?.toString().trim() || error.message}`);
}

if (failures.length > 0) {
  console.error("Integrated site validation failed:\n");
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Integrated site validation passed: ${htmlFiles.length} pages, ${requiredFiles.length} required assets.`);
}
