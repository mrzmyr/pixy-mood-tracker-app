import { describe, expect, test } from "bun:test";
import {
  getWorktreesDir,
  parseWorktrees,
  resolveTarget,
  validateSlug,
} from "../worktree.ts";

const WORKTREES = "/work/pixy-mood-tracker-worktrees";

describe("getWorktreesDir", () => {
  test("puts worktrees next to the main checkout", () => {
    expect(getWorktreesDir("/work/pixy-mood-tracker-app/.git")).toBe(WORKTREES);
  });
});

describe("validateSlug", () => {
  test("accepts lowercase words joined by single hyphens", () => {
    expect(validateSlug("tag-swipes-2")).toBe("tag-swipes-2");
  });
  test("rejects slugs that are unsafe folder or branch names", () => {
    for (const slug of [
      "",
      "Tag",
      "feat/tag",
      "../tag",
      "-tag",
      "tag-",
      "tag--swipes",
      "tag swipes",
      "x".repeat(61),
    ]) {
      expect(() => validateSlug(slug)).toThrow(
        expect.objectContaining({ status: "invalid_slug", exitCode: 2 })
      );
    }
  });
});

describe("resolveTarget", () => {
  test("resolves a slug inside the worktrees folder", () => {
    expect(resolveTarget("tag-swipes", WORKTREES)).toBe(
      `${WORKTREES}/tag-swipes`
    );
  });
  test("keeps an absolute path", () => {
    expect(resolveTarget("/tmp/old//checkout/", WORKTREES)).toBe(
      "/tmp/old/checkout/"
    );
  });
  test("rejects a relative path", () => {
    expect(() => resolveTarget("../old", WORKTREES)).toThrow(
      expect.objectContaining({ status: "invalid_target" })
    );
  });
});

describe("parseWorktrees", () => {
  test("reads branch, main checkout, detached, and prunable entries", () => {
    const porcelain = [
      "worktree /work/pixy-mood-tracker-app",
      "HEAD 1111111111111111111111111111111111111111",
      "branch refs/heads/main",
      "",
      "worktree /work/pixy-mood-tracker-worktrees/tag-swipes",
      "HEAD 2222222222222222222222222222222222222222",
      "branch refs/heads/feat/tag-swipes",
      "",
      "worktree /tmp/review",
      "HEAD 3333333333333333333333333333333333333333",
      "detached",
      "",
      "worktree /tmp/gone",
      "HEAD 4444444444444444444444444444444444444444",
      "branch refs/heads/fix/gone",
      "prunable gitdir file points to non-existent location",
      "",
    ].join("\n");
    expect(parseWorktrees(porcelain)).toEqual([
      {
        path: "/work/pixy-mood-tracker-app",
        branch: "main",
        isMain: true,
        isPrunable: false,
      },
      {
        path: "/work/pixy-mood-tracker-worktrees/tag-swipes",
        branch: "feat/tag-swipes",
        isMain: false,
        isPrunable: false,
      },
      { path: "/tmp/review", branch: null, isMain: false, isPrunable: false },
      {
        path: "/tmp/gone",
        branch: "fix/gone",
        isMain: false,
        isPrunable: true,
      },
    ]);
  });
});
