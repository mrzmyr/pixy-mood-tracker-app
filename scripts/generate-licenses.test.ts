import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectNotices, formatNotices } from "./generate-licenses";

const tempDirs: string[] = [];

interface FixturePackage {
  name: string;
  license?: string;
  repository?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const writePackage = (dir: string, pkg: FixturePackage, license?: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg));
  if (license) {
    fs.writeFileSync(path.join(dir, "LICENSE"), license);
  }
};

const makeProject = () => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "pixy-mood-tracker-licenses-"))
  );
  tempDirs.push(root);
  writePackage(root, {
    name: "app",
    dependencies: { alpha: "1" },
    optionalDependencies: { "not-installed": "1" },
    devDependencies: { "dev-tool": "1" },
  });
  const modules = path.join(root, "node_modules");
  writePackage(
    path.join(modules, "alpha"),
    { name: "alpha", dependencies: { beta: "1" } },
    "MIT text"
  );
  writePackage(path.join(modules, "beta"), {
    name: "beta",
    license: "ISC",
    repository: "github:example/beta",
  });
  writePackage(
    path.join(modules, "dev-tool"),
    { name: "dev-tool" },
    "MIT text"
  );
  return root;
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("generate-licenses", () => {
  test("follows production dependencies and skips dev dependencies", () => {
    const names = collectNotices(makeProject()).map((notice) => notice.name);

    expect(names.toSorted()).toEqual(["alpha", "beta"]);
  });

  test("falls back to the declared license when no license file exists", () => {
    const beta = collectNotices(makeProject()).find(
      (notice) => notice.name === "beta"
    );

    expect(beta?.text).toBe("ISC");
  });

  test("fails with a structured error when a required dependency is missing", () => {
    const root = makeProject();
    fs.rmSync(path.join(root, "node_modules/beta"), { recursive: true });

    expect(() => collectNotices(root)).toThrow(
      expect.objectContaining({
        status: "licenses_dependency_missing",
        why: expect.stringContaining("beta"),
        fix: expect.any(String),
      })
    );
  });

  test("shares one section between packages with identical license text", () => {
    const output = formatNotices([
      { name: "zeta", text: "MIT text" },
      { name: "alpha", text: "MIT text" },
      { name: "beta", text: "ISC" },
    ]);
    const sections = output.split("-----");

    expect(sections).toHaveLength(3);
    expect(sections[1]).toContain("product: alpha, zeta.");
    expect(sections[2]).toContain("product: beta.");
  });
});
