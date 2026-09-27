import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";

const root = path.resolve(import.meta.dir, "../../..");
const cli = path.join(root, "scripts/cli/index.ts");
let captureId = 0;
const call = async (...args: string[]) => {
  captureId += 1;
  const prefix = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-cli-${process.pid}-${captureId}`
  );
  const stdoutFile = `${prefix}.out`;
  const stderrFile = `${prefix}.err`;
  const child = Bun.spawn(
    [
      "/bin/zsh",
      "-c",
      'bun "$@" > "$CLI_OUT" 2> "$CLI_ERR"',
      "cli",
      cli,
      ...args,
    ],
    {
      cwd: root,
      env: { ...process.env, CLI_OUT: stdoutFile, CLI_ERR: stderrFile },
      stdout: "ignore",
      stderr: "ignore",
    }
  );
  const status = await child.exited;
  const stdout = fs.readFileSync(stdoutFile, "utf-8");
  const stderr = fs.readFileSync(stderrFile, "utf-8");
  fs.rmSync(stdoutFile, { force: true });
  fs.rmSync(stderrFile, { force: true });
  return { status, stdout, stderr };
};

// Age columns change between two calls. IDs do not.
const ids = (stdout: string) =>
  stdout.split("\n").map((line) => line.split(/\s+/u)[0]);

describe("CLI options", () => {
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
        ["e2e", "run", "--platform=ios", "--paths=e2e/flows,,e2e/apple"],
        2,
        "invalid_value",
      ],
      [["builds", "rm"], 2, "missing_option"],
      [["builds", "rm", "some-id"], 2, "unexpected_argument"],
    ];
    await Promise.all(
      cases.map(async ([args, code, status]) => {
        const result = await call(...args);
        expect(result.status).toBe(code);
        expect(result.stderr.split("\n")[0]).toContain(`error [${status}]:`);
        expect(result.stderr.trimEnd().split("\n")).toHaveLength(3);
      })
    );
  });

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

  test("build aliases list same table", async () => {
    const alias = await call("builds", "ls");
    const canonical = await call("builds", "list");
    expect(ids(alias.stdout)).toEqual(ids(canonical.stdout));
  });
});
