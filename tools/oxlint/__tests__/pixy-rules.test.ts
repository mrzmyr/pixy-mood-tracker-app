import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const OXLINT = path.join(ROOT, "node_modules/.bin/oxlint");
const PLUGIN = path.join(ROOT, "tools/oxlint/pixy-rules.cjs");

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pixy-rules-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const lint = (rule: string, source: string) => {
  const config = path.join(dir, ".oxlintrc.json");
  const file = path.join(dir, "fixture.tsx");
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [{ name: "pixy-standards", specifier: PLUGIN }],
      rules: { [`pixy-standards/${rule}`]: "error" },
    })
  );
  writeFileSync(file, source);
  const result = spawnSync(OXLINT, ["-c", config, file], { encoding: "utf-8" });
  return result.stdout.split(`pixy-standards(${rule})`).length - 1;
};

describe("no-layout-animation", () => {
  it("reports a named import from react-native", () => {
    expect(
      lint(
        "no-layout-animation",
        'import { LayoutAnimation, View } from "react-native";\nLayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);\n'
      )
    ).toBe(1);
  });

  it("reports access through a namespace import", () => {
    expect(
      lint(
        "no-layout-animation",
        'import * as RN from "react-native";\nRN.LayoutAnimation.configureNext(RN.LayoutAnimation.Presets.spring);\n'
      )
    ).toBe(2);
  });

  it("allows other react-native imports and other modules", () => {
    expect(
      lint(
        "no-layout-animation",
        'import { View } from "react-native";\nimport { LayoutAnimation } from "./local";\nexport const a = [View, LayoutAnimation];\n'
      )
    ).toBe(0);
  });
});

describe("prefer-react-use", () => {
  it("reports a named useContext import from react", () => {
    expect(
      lint(
        "prefer-react-use",
        'import { createContext, useContext } from "react";\nconst Ctx = createContext(0);\nexport const useValue = () => useContext(Ctx);\n'
      )
    ).toBe(1);
  });

  it("reports useContext through a React namespace or default import", () => {
    expect(
      lint(
        "prefer-react-use",
        'import React from "react";\nimport * as R from "react";\nconst Ctx = React.createContext(0);\nexport const a = () => React.useContext(Ctx);\nexport const b = () => R.useContext(Ctx);\n'
      )
    ).toBe(2);
  });

  it("allows use from react and useContext from other modules", () => {
    expect(
      lint(
        "prefer-react-use",
        'import { createContext, use } from "react";\nimport { useContext } from "./local";\nconst Ctx = createContext(0);\nexport const a = () => [use(Ctx), useContext];\n'
      )
    ).toBe(0);
  });
});

describe("no-hermes-missing-intl", () => {
  it("reports Intl constructors Hermes lacks", () => {
    expect(
      lint(
        "no-hermes-missing-intl",
        'export const now = new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(0, "second");\nexport const list = new Intl.ListFormat("en").format(["a", "b"]);\n'
      )
    ).toBe(2);
  });

  it("allows Intl APIs Hermes implements", () => {
    expect(
      lint(
        "no-hermes-missing-intl",
        'export const day = new Intl.DateTimeFormat("en").format(new Date());\nexport const count = new Intl.NumberFormat("en").format(3);\n'
      )
    ).toBe(0);
  });
});
