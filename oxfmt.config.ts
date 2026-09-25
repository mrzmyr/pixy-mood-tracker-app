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
    // Oxfmt joins the GitHub alert marker with its body in this file.
    "README.md",
  ],
});
