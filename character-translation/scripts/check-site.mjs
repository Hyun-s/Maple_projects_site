import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "index.html",
  ".nojekyll",
  "robots.txt",
  "sitemap.xml",
  "static/css/index.css",
  "static/js/index.js",
  "static/js/site-data.js",
  "static/images/favicon.svg",
  "static/images/experiment-overview.svg",
  "static/images/social-preview.png",
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) failures.push(`Missing required file: ${file}`);
}

const dataPath = resolve(root, "static/js/site-data.js");
const source = readFileSync(dataPath, "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "site-data.js" });
const data = sandbox.window.MAPLE_EXPERIMENT_DATA;

if (!data || typeof data !== "object") {
  failures.push("site-data.js must assign window.MAPLE_EXPERIMENT_DATA.");
}

const html = readFileSync(resolve(root, "index.html"), "utf8");
const localReferences = [...html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)]
  .map((match) => match[1])
  .filter((reference) => !/^(?:https?:|mailto:|tel:|data:)/i.test(reference));

for (const reference of localReferences) {
  const pathOnly = reference.split(/[?#]/, 1)[0].replace(/^\.\//, "");
  if (pathOnly && !existsSync(resolve(root, pathOnly))) {
    failures.push(`index.html references a missing local file: ${reference}`);
  }
}

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.has(match[1])) failures.push(`index.html links to a missing fragment: #${match[1]}`);
}

const forbiddenPatterns = [
  [/localhost(?::\d+)?/i, "localhost address"],
  [/\b127\.0\.0\.1\b/, "loopback IP address"],
  [/\b100\.(?:\d{1,3}\.){2}\d{1,3}\b/, "Tailscale/private IP address"],
  [/\.ts\.net\b/i, "Tailscale hostname"],
  [/\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"']+["']/i, "possible secret"],
];

for (const [pattern, label] of forbiddenPatterns) {
  if (pattern.test(source)) failures.push(`site-data.js contains a forbidden ${label}.`);
}

const results = Array.isArray(data?.results) ? data.results : [];
for (const [index, result] of results.entries()) {
  for (const field of ["name", "model", "method", "style"]) {
    if (typeof result[field] !== "string" || result[field].trim() === "") {
      failures.push(`results[${index}].${field} must be a non-empty string.`);
    }
  }
  for (const metric of ["quality", "identity", "overall"]) {
    const value = result.metrics?.[metric];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      failures.push(`results[${index}].metrics.${metric} must be a number from 0 to 1.`);
    }
  }
  const quality = result.metrics?.quality;
  const identity = result.metrics?.identity;
  const overall = result.metrics?.overall;
  if (Number.isFinite(quality) && Number.isFinite(identity) && Number.isFinite(overall)) {
    const expected = quality + identity === 0 ? 0 : (2 * quality * identity) / (quality + identity);
    if (Math.abs(overall - expected) > 0.002) {
      failures.push(
        `results[${index}].metrics.overall must be the harmonic mean of quality and identity ` +
          `(expected approximately ${expected.toFixed(3)}).`,
      );
    }
  }
}

const samples = Array.isArray(data?.samples) ? data.samples : [];
for (const [index, sample] of samples.entries()) {
  for (const [label, asset] of Object.entries({ input: sample.input, target: sample.target, generated: sample.generated })) {
    if (label === "target" && asset == null) continue;
    if (!asset?.src || typeof asset.src !== "string") {
      failures.push(`samples[${index}].${label}.src is required.`);
      continue;
    }
    if (/^(?:https?:)?\/\//i.test(asset.src)) {
      failures.push(`samples[${index}].${label}.src must be a local relative path.`);
      continue;
    }
    const normalized = asset.src.replace(/^\.\//, "");
    if (!normalized.startsWith("static/images/samples/")) {
      failures.push(`samples[${index}].${label}.src must be inside static/images/samples/.`);
    } else if (!existsSync(resolve(root, normalized))) {
      failures.push(`Sample image does not exist: ${normalized}`);
    }
    if (typeof asset.alt !== "string" || asset.alt.trim() === "") {
      failures.push(`samples[${index}].${label}.alt is required for accessibility.`);
    }
  }
}

if (results.length > 0) {
  if (!Number.isInteger(data?.benchmark?.sampleCount) || data.benchmark.sampleCount <= 0) {
    failures.push("benchmark.sampleCount must be a positive integer when results are published.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data?.benchmark?.lastEvaluated ?? "")) {
    failures.push("benchmark.lastEvaluated must use YYYY-MM-DD when results are published.");
  }
  const pendingProtocol = (data.protocol ?? []).filter((entry) => /pending/i.test(entry?.value ?? ""));
  if (pendingProtocol.length > 0) {
    failures.push("All protocol fields must be frozen before results are published.");
  }
}

if (failures.length > 0) {
  console.error("Site validation failed:\n");
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Site validation passed: ${results.length} result(s), ${samples.length} sample set(s).`);
}
