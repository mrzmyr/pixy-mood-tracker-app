import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

describe("no-direct-error-reporting", () => {
  it("reports Sentry.captureException through a namespace import", () => {
    expect(
      lint(
        "no-direct-error-reporting",
        'import * as Sentry from "@sentry/react-native";\nSentry.captureException(new Error("x"));\n'
      )
    ).toBe(1);
  });

  it("reports a named captureException import and Observe.reportError", () => {
    expect(
      lint(
        "no-direct-error-reporting",
        'import { captureException } from "@sentry/react-native";\nimport { Observe } from "expo-observe";\ncaptureException(1);\nObserve.reportError(1);\n'
      )
    ).toBe(2);
  });

  it("allows other Sentry and Observe calls", () => {
    expect(
      lint(
        "no-direct-error-reporting",
        'import * as Sentry from "@sentry/react-native";\nimport { Observe } from "expo-observe";\nSentry.init({});\nObserve.logEvent("a");\n'
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

/** Lint one fixture file at a path relative to a fake repo root. */
const lintAt = (relativeFile: string) => {
  const config = path.join(dir, ".oxlintrc.json");
  const file = path.join(dir, relativeFile);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [{ name: "pixy-standards", specifier: PLUGIN }],
      rules: { "pixy-standards/kebab-case-folders": "error" },
    })
  );
  writeFileSync(file, "export const a = 1;\n");
  const result = spawnSync(OXLINT, ["-c", config, relativeFile], {
    cwd: dir,
    encoding: "utf-8",
  });
  return result.stdout.split("pixy-standards(kebab-case-folders)").length - 1;
};

describe("kebab-case-folders", () => {
  it("reports a folder name that is not kebab-case", () => {
    expect(lintAt("src/features/calendar/screens/LogList/index.tsx")).toBe(1);
  });

  it("allows kebab-case and tool-owned folders", () => {
    expect(lintAt("src/features/log-list/__tests__/index.tsx")).toBe(0);
    expect(lintAt("src/app/(app)/logs/[id]/edit.tsx")).toBe(0);
  });
});

describe("modal-route-shows-header", () => {
  it("reports a modal route that hides the header", () => {
    expect(
      lint(
        "modal-route-shows-header",
        'const options = { presentation: "modal", headerShown: false };\n'
      )
    ).toBe(1);
  });

  it("allows a modal route with the native bar", () => {
    expect(
      lint(
        "modal-route-shows-header",
        'const options = { presentation: "formSheet", headerShown: true };\n'
      )
    ).toBe(0);
  });

  it("allows a transparent media overlay", () => {
    expect(
      lint(
        "modal-route-shows-header",
        'const options = { presentation: "transparentModal", headerShown: false };\n'
      )
    ).toBe(0);
  });
});

/** Lint one fixture with `component-scope`: Bezel allowed in statistics only. */
const BEZEL_SCOPE = [
  {
    name: "@/components/bezel",
    allow: ["src/components/", "src/features/statistics/"],
    message: "Bezel is for statistics cards only.",
  },
];

const lintScopeAt = (
  relativeFile: string,
  source: string,
  modules: object[] = BEZEL_SCOPE
) => {
  const config = path.join(dir, ".oxlintrc.json");
  const file = path.join(dir, relativeFile);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [{ name: "pixy-standards", specifier: PLUGIN }],
      rules: {
        "pixy-standards/component-scope": [
          "error",
          {
            modules,
          },
        ],
      },
    })
  );
  writeFileSync(file, source);
  const result = spawnSync(OXLINT, ["-c", config, relativeFile], {
    cwd: dir,
    encoding: "utf-8",
  });
  return result.stdout.split("pixy-standards(component-scope)").length - 1;
};

describe("component-scope", () => {
  it("reports an import outside the allowed folders", () => {
    expect(
      lintScopeAt(
        "src/features/calendar/card.tsx",
        'import Bezel from "@/components/bezel";\n'
      )
    ).toBe(1);
  });

  it("reports a relative import of the same module", () => {
    expect(
      lintScopeAt(
        "src/shell/card.tsx",
        'import Bezel from "../components/bezel";\n'
      )
    ).toBe(1);
  });

  it("allows the import inside an allowed folder", () => {
    expect(
      lintScopeAt(
        "src/features/statistics/card.tsx",
        'import Bezel from "@/components/bezel";\n'
      )
    ).toBe(0);
  });

  it("allows a type-only import", () => {
    expect(
      lintScopeAt(
        "src/features/calendar/card.tsx",
        'import type Bezel from "@/components/bezel";\n'
      )
    ).toBe(0);
  });
});

describe("button-label-children", () => {
  it("reports a raw Text child in Button and LinkButton", () => {
    expect(
      lint(
        "button-label-children",
        'import { Text } from "react-native";\nimport Button from "@/components/button";\nimport LinkButton from "@/components/link-button";\nexport const A = () => (\n  <>\n    <Button><Text>Save</Text></Button>\n    <LinkButton><Text>Skip</Text></LinkButton>\n  </>\n);\n'
      )
    ).toBe(2);
  });

  it("allows a label string and ButtonText", () => {
    expect(
      lint(
        "button-label-children",
        'import { Text } from "react-native";\nimport Button from "@/components/button";\nimport { ButtonText } from "@/components/button-content";\nexport const A = () => (\n  <>\n    <Button>Save</Button>\n    <Button><ButtonText>Save</ButtonText></Button>\n    <Text>Note</Text>\n  </>\n);\n'
      )
    ).toBe(0);
  });
});

describe("component-scope importNames", () => {
  const modalScope = [
    {
      name: "react-native",
      importNames: ["Modal"],
      allow: ["src/components/sheet-modal.tsx"],
      message: "Use SheetModal.",
    },
  ];

  it("reports only the scoped named import", () => {
    expect(
      lintScopeAt(
        "src/features/tags/picker.tsx",
        'import { Modal, View } from "react-native";\n',
        modalScope
      )
    ).toBe(1);
  });

  it("allows other named imports from the same module", () => {
    expect(
      lintScopeAt(
        "src/features/tags/picker.tsx",
        'import { View } from "react-native";\n',
        modalScope
      )
    ).toBe(0);
  });
});

describe("sheet-keyboard-layout", () => {
  it("reports keyboard layout in a file that renders a sheet", () => {
    expect(
      lint(
        "sheet-keyboard-layout",
        'import { Keyboard, KeyboardAvoidingView } from "react-native";\nimport SheetModal from "@/components/sheet-modal";\nKeyboard.addListener("keyboardDidShow", () => {});\n'
      )
    ).toBe(2);
  });

  it("allows keyboard layout in a file without a sheet", () => {
    expect(
      lint(
        "sheet-keyboard-layout",
        'import { KeyboardAvoidingView } from "react-native";\n'
      )
    ).toBe(0);
  });
});

describe("header-button-only", () => {
  it("reports another element in a ModalHeader slot", () => {
    expect(
      lint(
        "header-button-only",
        'import ModalHeader from "@/components/modal-header";\nimport LinkButton from "@/components/link-button";\nexport const A = ({ busy }: { busy: boolean }) => (\n  <ModalHeader left={<LinkButton>Cancel</LinkButton>} right={busy ? null : <LinkButton>Save</LinkButton>} />\n);\n'
      )
    ).toBe(2);
  });

  it("allows HeaderButton and a spinner", () => {
    expect(
      lint(
        "header-button-only",
        'import { ActivityIndicator } from "react-native";\nimport ModalHeader from "@/components/modal-header";\nimport { HeaderButton } from "@/components/header-button";\nexport const A = ({ busy }: { busy: boolean }) => (\n  <ModalHeader left={<HeaderButton kind="cancel" label="Cancel" onPress={() => {}} />} right={busy ? <ActivityIndicator /> : <HeaderButton kind="confirm" label="Save" onPress={() => {}} />} />\n);\n'
      )
    ).toBe(0);
  });
});

describe("no-color-shading", () => {
  it("reports chroma shading", () => {
    expect(
      lint(
        "no-color-shading",
        'import chroma from "chroma-js";\nexport const a = chroma("#fff").darken(1).hex();\nexport const b = chroma("#000").brighten(1).hex();\n'
      )
    ).toBe(2);
  });

  it("allows chroma alpha for fades", () => {
    expect(
      lint(
        "no-color-shading",
        'import chroma from "chroma-js";\nexport const a = chroma("#fff").alpha(0).css();\n'
      )
    ).toBe(0);
  });
});

describe("radius-token", () => {
  it("reports a radius literal of 4 or more", () => {
    expect(
      lint(
        "radius-token",
        "export const a = { borderRadius: 12, borderTopLeftRadius: 4 };\n"
      )
    ).toBe(2);
  });

  it("allows tokens, circles, and hairline rounding below 4", () => {
    expect(
      lint(
        "radius-token",
        "const RADIUS = { md: 12 };\nconst size = 40;\nexport const a = { borderRadius: RADIUS.md, borderBottomRightRadius: size / 2, borderTopRightRadius: 2 };\n"
      )
    ).toBe(0);
  });
});

describe("no-reduce-motion-never", () => {
  it("reports ReduceMotion.Never", () => {
    expect(
      lint(
        "no-reduce-motion-never",
        'import { ReduceMotion } from "react-native-reanimated";\nexport const a = { reduceMotion: ReduceMotion.Never };\n'
      )
    ).toBe(1);
  });

  it("allows ReduceMotion.System", () => {
    expect(
      lint(
        "no-reduce-motion-never",
        'import { ReduceMotion } from "react-native-reanimated";\nexport const a = { reduceMotion: ReduceMotion.System };\n'
      )
    ).toBe(0);
  });
});

/** Lint one fixture with `title-case-labels` against a fixture English locale. */
const lintTitles = (source: string) => {
  const config = path.join(dir, ".oxlintrc.json");
  const locale = path.join(dir, "en.json");
  writeFileSync(
    locale,
    JSON.stringify({
      save_tag: "Save Tag",
      try_again: "Try again",
      skip_step: "I don't track emotions",
      tagline: "See what shapes how you feel.",
      show_all: "Show All of Them",
    })
  );
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [{ name: "pixy-standards", specifier: PLUGIN }],
      rules: {
        "pixy-standards/title-case-labels": ["error", { localeFile: locale }],
      },
    })
  );
  writeFileSync(path.join(dir, "fixture.tsx"), source);
  const result = spawnSync(OXLINT, ["-c", config, "fixture.tsx"], {
    cwd: dir,
    encoding: "utf-8",
  });
  return result.stdout.split("pixy-standards(title-case-labels)").length - 1;
};

describe("title-case-labels", () => {
  it("reports sentence case in a button, header button, and heading", () => {
    expect(
      lintTitles(
        'export const A = () => (\n  <>\n    <Button>{t("try_again")}</Button>\n    <HeaderButton kind="confirm" label={t("try_again")} />\n    <Text accessibilityRole="header">{t("try_again")}</Text>\n  </>\n);\n'
      )
    ).toBe(3);
  });

  it("reports sentence case in an alert title and alert button", () => {
    expect(
      lintTitles(
        'Alert.alert(t("try_again"), t("tagline"), [{ text: t("try_again") }, { text: t("save_tag") }]);\n'
      )
    ).toBe(2);
  });

  it("allows Title Case, small words, and full sentences", () => {
    expect(
      lintTitles(
        'export const A = () => (\n  <>\n    <Button>{t("save_tag")}</Button>\n    <LinkButton>{t("skip_step")}</LinkButton>\n    <Text accessibilityRole="header">{t("tagline")}</Text>\n    <MenuListItem title={t("show_all")} />\n    <Text>{t("try_again")}</Text>\n  </>\n);\n'
      )
    ).toBe(0);
  });
});
