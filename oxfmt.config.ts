import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

/**
 * Oxfmt config: Ultracite defaults with import sorting disabled, because
 * import evaluation order affects React Native module initialization.
 */
export default defineConfig({
  ...ultracite,
  // Import evaluation order can affect React Native module initialization.
  sortImports: false,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    ".agents/**",
    ".claude/**",
    ".codex/**",
    // Generated store screenshot prototypes (built by build.py), not app code.
    "docs/store-screenshots/**",
    // Oxfmt joins the GitHub alert marker with its body in this file.
    "README.md",
    // release-please rewrites these on every release without formatting.
    "CHANGELOG.md",
    "app.json",
  ],
});
