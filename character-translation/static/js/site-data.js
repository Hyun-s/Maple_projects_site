/*
 * Public experiment data only.
 *
 * Keep this file free of API keys, internal URLs, model artifacts, private dataset
 * paths, and unapproved samples. See README.md for the result and sample schemas.
 */
window.MAPLE_EXPERIMENT_DATA = {
  siteUpdatedAt: "2026.08.25",

  protocol: [
    { label: "Dataset source", value: "Maple Image Maker" },
    { label: "Dataset version", value: "Pending" },
    { label: "Benchmark split", value: "Pending" },
    { label: "Target styles", value: "Anime · Realistic" },
    { label: "Base models", value: "SDXL 1.0 · FLUX.1-dev" },
    { label: "Evaluation seed", value: "42 (initial)" },
  ],

  benchmark: {
    sampleCount: null,
    lastEvaluated: null,
  },

  // Add verified benchmark runs here. Leave empty until a run is approved.
  results: [],

  // Add approved input / target / generated triplets here. Leave empty otherwise.
  samples: [],

  changelog: [
    {
      date: "2026-08-25",
      title: "Evaluation record copy revised",
      description:
        "Reframed every section in consistent technical English without changing protocol or publication status.",
    },
    {
      date: "2026-07-22",
      title: "Evaluation record initialized",
      description:
        "Protocol, result table, and qualitative sample slots prepared. No benchmark results published.",
    },
  ],
};
