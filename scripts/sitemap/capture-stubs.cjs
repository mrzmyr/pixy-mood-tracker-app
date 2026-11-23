// Imports that sitemap capture bundles replace with a stub, as
// `{ importing file: { import spec: stub file } }`, paths from the repo root.
// Use for UI that no captured state can show and that would otherwise put a
// large dependency into every state's input hash. metro.config.js applies
// the map in capture bundles only; scripts/sitemap/import-graph.ts follows it.
module.exports = {
  // The storage error screen never shows in a capture: fixtures always load.
  "src/shell/storage-load-gate.tsx": {
    "@/features/feedback": "scripts/sitemap/stubs/feedback.tsx",
  },
};
