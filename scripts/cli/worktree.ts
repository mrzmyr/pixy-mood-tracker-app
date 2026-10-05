import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  CliError,
  defineCommand,
  formatAge,
  note,
  printTable,
  tryRun,
} from "./shared.ts";
import type { Noun } from "./shared.ts";

const WORKTREES_DIR_NAME = "pixy-mood-tracker-worktrees";
const DEFAULT_FROM = "origin/main";
const MAX_SLUG_LENGTH = 60;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const REPO_ROOT = path.resolve(import.meta.dir, "../..");

interface Worktree {
  path: string;
  branch: string | null;
  isMain: boolean;
  isPrunable: boolean;
}

/** Rejects slugs that are unsafe as folder names or branch names. */
const validateSlug = (slug: string) => {
  if (!SLUG.test(slug) || slug.length > MAX_SLUG_LENGTH) {
    throw new CliError({
      exitCode: 2,
      status: "invalid_slug",
      message: `Invalid slug "${slug}"`,
      why: `Slug must be 1 to ${MAX_SLUG_LENGTH} lowercase letters, digits, and single hyphens.`,
      fix: "Pass a slug like `tag-swipes`.",
    });
  }
  return slug;
};

/**
 * Worktrees live next to the main checkout:
 * `<parent of main checkout>/pixy-mood-tracker-worktrees`.
 * `commonDir` is the absolute output of `git rev-parse --git-common-dir`,
 * the `.git` folder of the main checkout.
 */
const getWorktreesDir = (commonDir: string) =>
  path.join(path.dirname(path.dirname(commonDir)), WORKTREES_DIR_NAME);

/** Parses `git worktree list --porcelain`. The first entry is the main checkout. */
const parseWorktrees = (porcelain: string): Worktree[] =>
  porcelain
    .split(/\n\n+/u)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split("\n");
      const value = (key: string) =>
        lines
          .find((line) => line === key || line.startsWith(`${key} `))
          ?.slice(key.length + 1);
      const branch = value("branch");
      return {
        path: value("worktree") ?? "",
        branch: branch ? branch.replace(/^refs\/heads\//u, "") : null,
        isMain: index === 0,
        isPrunable: lines.some((line) => line.startsWith("prunable")),
      };
    });

/**
 * A slug resolves to `<worktreesDir>/<slug>`. Any other value must be an
 * absolute path: `bun run` starts scripts in the package folder, so a
 * relative path would not resolve from the caller's folder.
 */
const resolveTarget = (target: string, worktreesDir: string) => {
  if (path.isAbsolute(target)) {
    return path.normalize(target);
  }
  if (target.includes("/")) {
    throw new CliError({
      exitCode: 2,
      status: "invalid_target",
      message: `Relative path "${target}"`,
      why: "bun run starts the CLI in the checkout folder, not in your folder.",
      fix: "Pass a slug or an absolute path from `bun worktree list`.",
    });
  }
  return path.join(worktreesDir, validateSlug(target));
};

const git = (args: string[], cwd = REPO_ROOT, timeout = 120_000) => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    }).trim();
  } catch (error) {
    // SAFETY: execFileSync errors carry the child's stderr.
    const stderr = String((error as { stderr?: unknown }).stderr ?? "").trim();
    throw new CliError({
      status: "git_failed",
      message: `git ${args[0]} failed`,
      why: stderr.split("\n").at(-1) || String(error),
      fix: `Run \`git ${args.join(" ")}\` in ${cwd} and fix the cause.`,
    });
  }
};

const getCommonDir = () =>
  git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);

const listWorktrees = () =>
  parseWorktrees(git(["worktree", "list", "--porcelain"]));

const realPath = (target: string) =>
  fs.existsSync(target) ? fs.realpathSync(target) : path.resolve(target);

const install = (dir: string) => {
  note(`Installing dependencies in ${dir}`);
  // stdout carries the worktree path only. Install output goes to stderr.
  const result = spawnSync("bun", ["install", "--frozen-lockfile"], {
    cwd: dir,
    stdio: ["ignore", process.stderr, process.stderr],
  });
  if (result.status !== 0) {
    throw new CliError({
      status: "install_failed",
      message: "bun install failed in new worktree",
      why: `\`bun install --frozen-lockfile\` exited with ${result.status ?? result.signal}. The worktree exists without dependencies.`,
      fix: `Run \`bun install --frozen-lockfile\` in ${dir}. Never symlink node_modules from another checkout.`,
    });
  }
};

const ensureInstalled = (dir: string, isInstall: boolean) => {
  if (isInstall && !fs.existsSync(path.join(dir, "node_modules"))) {
    install(dir);
  }
};

const cmdNew = (values: Record<string, string | undefined>) => {
  const slug = validateSlug(values.slug ?? "");
  const branch = values.branch ?? slug;
  const isInstall = values["no-install"] === undefined;
  if (tryRun("git", ["check-ref-format", "--branch", branch]) === null) {
    throw new CliError({
      exitCode: 2,
      status: "invalid_branch",
      message: `Invalid branch name "${branch}"`,
      why: "git check-ref-format rejects this name.",
      fix: "Pass --branch=<type>/<slug>, for example --branch=feat/tag-swipes.",
    });
  }
  const worktreesDir = getWorktreesDir(getCommonDir());
  const dir = path.join(worktreesDir, slug);

  note("Fetching origin");
  git(["fetch", "origin"]);
  // Drop records of deleted worktree folders. They block `git worktree add`.
  git(["worktree", "prune"]);

  const existing = listWorktrees().find(
    (worktree) => worktree.branch === branch
  );
  if (existing?.isMain) {
    throw new CliError({
      status: "branch_in_main_checkout",
      message: `Branch ${branch} is checked out in the main checkout`,
      why: "Code changes never happen in the main checkout. Git allows one checkout per branch.",
      fix: `Pass another --branch, or switch the main checkout at ${existing.path} to another branch.`,
    });
  }
  if (existing) {
    note(`Branch ${branch} is already checked out. Reusing its worktree.`);
    ensureInstalled(existing.path, isInstall);
    console.log(existing.path);
    return;
  }
  if (fs.existsSync(dir)) {
    throw new CliError({
      status: "slug_taken",
      message: `Folder ${dir} already exists`,
      why: `It holds no worktree of branch ${branch}.`,
      fix: "Pass another slug, or run `bun worktree list` and remove the old worktree.",
    });
  }

  const hasBranch =
    tryRun("git", [
      "show-ref",
      "--verify",
      "--quiet",
      `refs/heads/${branch}`,
    ]) !== null;
  if (hasBranch && values.from !== undefined) {
    throw new CliError({
      exitCode: 2,
      status: "branch_exists",
      message: `Branch ${branch} already exists`,
      why: "--from sets the start of a new branch only.",
      fix: `Drop --from to check out ${branch}, or pass a new --branch.`,
    });
  }
  const from = values.from ?? DEFAULT_FROM;
  if (
    !hasBranch &&
    tryRun("git", ["rev-parse", "--verify", "--quiet", `${from}^{commit}`]) ===
      null
  ) {
    throw new CliError({
      exitCode: 2,
      status: "ref_not_found",
      message: `Unknown ref "${from}"`,
      why: "--from must name a commit, branch, or tag.",
      fix: `Pass --from=${DEFAULT_FROM} or another ref from \`git branch -a\`.`,
    });
  }

  fs.mkdirSync(worktreesDir, { recursive: true });
  // --no-track: a new branch must not push to its start ref, e.g. main.
  git(
    hasBranch
      ? ["worktree", "add", dir, branch]
      : ["worktree", "add", "--no-track", "-b", branch, dir, from]
  );
  note(
    hasBranch
      ? `Created worktree of existing branch ${branch}`
      : `Created worktree with new branch ${branch} from ${from}`
  );
  if (isInstall) {
    install(dir);
  }
  console.log(dir);
};

const countDirty = (dir: string) =>
  git(["status", "--porcelain"], dir).split("\n").filter(Boolean).length;

const getOperation = (dir: string) => {
  const gitDir = git(["rev-parse", "--path-format=absolute", "--git-dir"], dir);
  const markers: [string, string][] = [
    ["rebase-merge", "rebase"],
    ["rebase-apply", "rebase"],
    ["MERGE_HEAD", "merge"],
    ["CHERRY_PICK_HEAD", "cherry-pick"],
    ["REVERT_HEAD", "revert"],
  ];
  return (
    markers.find(([file]) => fs.existsSync(path.join(gitDir, file)))?.[1] ?? "-"
  );
};

const cmdRm = (values: Record<string, string | undefined>) => {
  const worktreesDir = getWorktreesDir(getCommonDir());
  const dir = realPath(resolveTarget(values.target ?? "", worktreesDir));
  const worktree = listWorktrees().find(
    (entry) => realPath(entry.path) === dir
  );
  if (!worktree) {
    throw new CliError({
      status: "worktree_not_found",
      message: `No worktree at ${dir}`,
      why: "git worktree list has no entry for this path.",
      fix: "Run `bun worktree list` and pass a slug or path from it.",
    });
  }
  if (worktree.isMain) {
    throw new CliError({
      status: "main_checkout",
      message: "Refusing to remove the main checkout",
      why: "All worktrees share the main checkout's .git folder.",
      fix: "Pass a worktree path from `bun worktree list`.",
    });
  }
  const isForce = values.force !== undefined;
  if (!worktree.isPrunable && !isForce) {
    const dirty = countDirty(worktree.path);
    if (dirty > 0) {
      throw new CliError({
        status: "worktree_dirty",
        message: `Worktree has ${dirty} uncommitted change(s)`,
        why: "Removing it deletes uncommitted work.",
        fix: `Commit or stash in ${worktree.path}, or pass --force to discard.`,
      });
    }
  }
  // Run from the main checkout: the removed folder may be this CLI's checkout.
  const mainRoot = path.dirname(getCommonDir());
  git(["worktree", "remove", ...(isForce ? ["--force"] : []), dir], mainRoot);
  git(["worktree", "prune"], mainRoot);
  note(`Removed worktree ${dir}`);
  if (worktree.branch) {
    note(`Branch ${worktree.branch} still exists.`);
  }
  note("Run `bun builds prune` to free its simulator and checkout state.");
};

const cmdList = () => {
  const rows = listWorktrees().map((worktree) => {
    if (worktree.isPrunable || !fs.existsSync(worktree.path)) {
      return [
        worktree.path,
        worktree.branch ?? "(detached)",
        "-",
        "missing",
        "-",
      ];
    }
    const lastCommit = tryRun("git", [
      "-C",
      worktree.path,
      "log",
      "-1",
      "--format=%cI",
    ]);
    return [
      worktree.path,
      `${worktree.branch ?? "(detached)"}${worktree.isMain ? " (main checkout)" : ""}`,
      String(countDirty(worktree.path)),
      getOperation(worktree.path),
      lastCommit ? formatAge(lastCommit) : "-",
    ];
  });
  printTable(["PATH", "BRANCH", "DIRTY", "STATE", "LAST COMMIT"], rows);
};

const WORKTREE: Noun = {
  summary: "Create, list, and remove worktrees for code changes.",
  commandOrder: ["new", "list", "rm"],
  helpTail: [
    "Run `bun worktree <command> --help` for details. Aliases: ls = list, remove = rm.",
  ],
  commands: {
    new: defineCommand({
      usage:
        "Usage: bun worktree new <slug> [--branch=<name>] [--from=<ref>] [--no-install]",
      summary: "Create a worktree with installed dependencies. Print its path.",
      positional: {
        name: "slug",
        value: "<slug>",
        description: [
          `Folder name. 1 to ${MAX_SLUG_LENGTH} lowercase letters, digits, and hyphens.`,
        ],
      },
      options: {
        branch: {
          value: "<name>",
          description: [
            "Optional. Branch to create or check out. Default: <slug>.",
          ],
        },
        from: {
          value: "<ref>",
          description: [
            `Optional. Start of a new branch. Default: ${DEFAULT_FROM}.`,
          ],
        },
        "no-install": {
          description: [
            "Skip `bun install`. Hooks and checks fail without it.",
          ],
        },
      },
      sections: [
        {
          title: "Behavior",
          lines: [
            "Runs `git fetch origin`.",
            `Creates <parent of main checkout>/${WORKTREES_DIR_NAME}/<slug>.`,
            "Branch already checked out in a worktree: reuses that worktree.",
            "Runs `bun install --frozen-lockfile`. Never symlinks node_modules.",
          ],
        },
        {
          title: "Output",
          lines: [
            "Worktree path as last line on stdout. Progress goes to stderr.",
          ],
        },
        {
          title: "Examples",
          lines: [
            "bun worktree new tag-swipes --branch=feat/tag-swipes",
            "bun worktree new fix-crash --branch=fix/crash --from=origin/release",
          ],
        },
      ],
      errors: {
        missing_argument: "No <slug> passed",
        invalid_slug: "<slug> has characters other than a-z, 0-9, -",
        invalid_branch: "--branch is not a valid git branch name",
        branch_exists: "--from passed for a branch that exists",
        ref_not_found: "--from names no commit",
        slug_taken: "Folder exists and holds another branch",
        branch_in_main_checkout: "Main checkout has --branch checked out",
        install_failed: "bun install failed. Worktree stays.",
        git_failed: "A git command failed",
      },
      run: (values) => cmdNew(values),
    }),
    list: defineCommand({
      usage: "Usage: bun worktree list",
      summary: "List worktrees with branch, uncommitted changes, and state.",
      sections: [
        {
          title: "Output",
          lines: [
            "Table on stdout, one row per worktree. First row: main checkout.",
            "DIRTY        Count of uncommitted changes",
            "STATE        merge, rebase, cherry-pick, or revert in progress; missing when the folder is gone",
            "LAST COMMIT  Age of the last commit",
          ],
        },
      ],
      run: () => cmdList(),
    }),
    rm: defineCommand({
      usage: "Usage: bun worktree rm <slug|path> [--force]",
      summary: "Remove one worktree. Keep its branch.",
      positional: {
        name: "target",
        value: "<slug|path>",
        description: [
          "Slug from `bun worktree new`, or an absolute worktree path.",
        ],
      },
      options: {
        force: {
          description: ["Remove even with uncommitted changes. Discards them."],
        },
      },
      sections: [
        {
          title: "Behavior",
          lines: [
            "Refuses a worktree with uncommitted changes unless --force.",
            "Runs `git worktree prune` after removal.",
            "Run `bun builds prune` after to free its simulator and checkout state.",
          ],
        },
        {
          title: "Examples",
          lines: [
            "bun worktree rm tag-swipes",
            "bun worktree rm /path/to/old-checkout --force",
          ],
        },
      ],
      errors: {
        missing_argument: "No <slug|path> passed",
        invalid_slug: "<slug> has characters other than a-z, 0-9, -",
        invalid_target: "Path is relative",
        worktree_not_found: "No worktree at this path",
        main_checkout: "Path is the main checkout",
        worktree_dirty: "Worktree has uncommitted changes",
        git_failed: "A git command failed",
      },
      run: (values) => cmdRm(values),
    }),
  },
};

/** `bun worktree` commands and their pure path and slug rules. */
export {
  WORKTREE,
  getWorktreesDir,
  parseWorktrees,
  resolveTarget,
  validateSlug,
};
