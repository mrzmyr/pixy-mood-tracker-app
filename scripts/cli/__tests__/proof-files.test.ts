import { expect, test } from "bun:test";

// PR proof goes to the PR body (.agents/skills/pr-proof/SKILL.md), never into git.
const PROOF_PATHS = ["docs/pr-evidence", "screens", "output"];

test("git tracks no PR proof files", () => {
  const result = Bun.spawnSync(["git", "ls-files", "--", ...PROOF_PATHS]);
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString().split("\n").filter(Boolean)).toEqual([]);
});
