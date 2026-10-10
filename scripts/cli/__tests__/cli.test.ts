import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";

const root = path.resolve(import.meta.dir, "../../..");
const cli = path.join(root, "scripts/cli/index.ts");
let callId = 0;

// Output goes to files: inside `bun test` in this repo, child pipes return
// empty output.
const call = async (...args: string[]) => {
  callId += 1;
  const prefix = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-cli-${process.pid}-${callId}`
  );
  const child = Bun.spawn([process.execPath, cli, ...args], {
    cwd: root,
    stderr: Bun.file(`${prefix}.err`),
    stdout: Bun.file(`${prefix}.out`),
  });
  const status = await child.exited;
  const [stdout, stderr] = [`${prefix}.out`, `${prefix}.err`].map((file) => {
    const text = fs.readFileSync(file, "utf-8");
    fs.rmSync(file, { force: true });
    return text;
  });
  return { status, stdout, stderr };
};

// Age columns change between two calls. IDs do not.
const ids = (stdout: string) =>
  stdout.split("\n").map((line) => line.split(/\s+/u)[0]);

describe("CLI options", () => {
  // Spawns one CLI process per case at once; 2-core CI runners need more than the 5 s default.
  test("rejects invalid commands in parse order", async () => {
    const cases: [string[], number, string][] = [
      [["app", "install", "ios"], 2, "unexpected_argument"],
      [["app", "install"], 2, "missing_option"],
      [
        ["app", "install", "--platform=ios", "--target=x"],
        2,
        "conflicting_options",
      ],
      [["app", "install", "--platform=windows"], 2, "invalid_platform"],
      [["app", "install", "--platform="], 2, "missing_value"],
      [["app", "install", "--platform"], 2, "missing_value"],
      [
        ["app", "install", "--platform=ios", "--platform=android"],
        2,
        "duplicate_option",
      ],
      [["app", "install", "--device=x"], 2, "invalid_option"],
      [["app", "seed", "--platform=ios"], 2, "missing_option"],
      [["app", "dev"], 2, "missing_option"],
      [["app", "dev", "--target=x"], 2, "invalid_option"],
      [["app", "dev", "--platform=windows"], 2, "invalid_platform"],
      [
        ["app", "dev", "--platform=ios", "--fixture=nope"],
        2,
        "fixture_not_found",
      ],
      [["app", "dev", "--platform=ios", "--flag=nope=on"], 2, "invalid_flag"],
      [
        ["app", "seed", "--platform=ios", "--fixture=year", "--variant=prod"],
        2,
        "invalid_value",
      ],
      [
        ["app", "seed", "--platform=ios", "--fixture=nope"],
        2,
        "fixture_not_found",
      ],
      [["app", "seed", "ios", "year"], 2, "unexpected_argument"],
      [
        ["e2e", "run", "--platform=ios", "--paths=e2e/flows/nope.yaml"],
        2,
        "path_not_found",
      ],
      [
        ["e2e", "run", "--platform=ios", "--paths=e2e/flows,,e2e/subflows"],
        2,
        "invalid_value",
      ],
      [["e2e", "run", "--platform=ios", "--video=yes"], 2, "unexpected_value"],
      [
        ["e2e", "run", "--platform=ios", "--video", "--video"],
        2,
        "duplicate_option",
      ],
      [["builds", "rm"], 2, "missing_option"],
      [["builds", "rm", "some-id"], 2, "unexpected_argument"],
      [["builds", "rm", "--build=no-such-build-id"], 2, "build_not_found"],
      [["builds", "prune", "--older-than=soon"], 2, "invalid_value"],
      [["builds", "reclaim", "--older-than=0"], 2, "invalid_value"],
      [["builds", "reclaim", "--dry-run=yes"], 2, "unexpected_value"],
      [["app", "drive", "--", "snapshot"], 2, "missing_option"],
      [["app", "drive", "--platform=ios"], 2, "missing_argument"],
      [["app", "drive", "--platform=ios", "--"], 2, "missing_argument"],
      [
        ["app", "drive", "--platform=ios", "--", "snapshot", "--udid", "x"],
        2,
        "conflicting_options",
      ],
      [["devices", "reserve", "--target=x"], 2, "missing_option"],
      [["devices", "reserve", "--target=x", "--goal=  "], 2, "invalid_goal"],
      [
        ["devices", "reserve", "--target=x", `--goal=${"x".repeat(121)}`],
        2,
        "invalid_goal",
      ],
      [["worktree", "new"], 2, "missing_argument"],
      [["worktree", "new", "Tag/Swipes"], 2, "invalid_slug"],
      [["worktree", "new", "a", "b"], 2, "unexpected_argument"],
      [["worktree", "rm"], 2, "missing_argument"],
      [["worktree", "rm", "../old"], 2, "invalid_target"],
    ];
    await Promise.all(
      cases.map(async ([args, code, status]) => {
        const result = await call(...args);
        expect(result.status).toBe(code);
        const errorLines = result.stderr
          .slice(result.stderr.indexOf("error ["))
          .trimEnd()
          .split("\n");
        expect(errorLines[0]).toContain(`error [${status}]:`);
        expect(errorLines).toHaveLength(3);
      })
    );
  }, 30_000);

  test("help wins over invalid values and matches golden output", async () => {
    const result = await call("app", "install", "--platform=windows", "--help");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(
      fs.readFileSync(
        path.join(import.meta.dir, "help/app-install.txt"),
        "utf-8"
      )
    );
    const shortHelp = await call("app", "install", "-h");
    expect(shortHelp.stdout).toBe(result.stdout);
  });

  test("every help page matches its golden file byte for byte", async () => {
    const helpDir = path.join(import.meta.dir, "help");
    const files = fs
      .readdirSync(helpDir)
      .filter((file) => file.endsWith(".txt"));
    await Promise.all(
      files.map(async (file) => {
        const [noun, ...verbParts] = file.slice(0, -4).split("-");
        const args = verbParts.length
          ? [noun, verbParts.join("-"), "--help"]
          : [noun, "--help"];
        const result = await call(...args);
        expect(result.status).toBe(0);
        expect(result.stdout).toBe(
          fs.readFileSync(path.join(helpDir, file), "utf-8")
        );
      })
    );
  });

  test("long commands end with a result line on usage errors", async () => {
    const result = await call("e2e", "run", "--platform=windows");
    expect(result.status).toBe(2);
    expect(result.stdout.trimEnd().split("\n").at(-1)).toBe(
      "PIXY_RESULT status=error command=e2e-run code=invalid_platform"
    );
    const short = await call("app", "seed", "--platform=windows");
    expect(short.stdout).not.toContain("PIXY_RESULT");
  });

  test("build aliases list same table", async () => {
    const alias = await call("builds", "ls");
    const canonical = await call("builds", "list");
    expect(ids(alias.stdout)).toEqual(ids(canonical.stdout));
  });
});
