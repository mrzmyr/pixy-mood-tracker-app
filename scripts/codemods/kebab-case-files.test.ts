import { describe, expect, test } from "bun:test";
import {
  buildRenameMap,
  findCollisions,
  rewriteContent,
  toKebabPath,
} from "./kebab-case-files";

const FILES = [
  "src/app/(app)/days/[date].tsx",
  "src/__mocks__/@expo/ui/jetpack-compose.js",
  "src/components/Clock.ios.tsx",
  "src/components/Clock.tsx",
  "src/components/__tests__/Clock.tsx",
  "src/features/calendar/screens/Calendar/index.tsx",
  "src/features/calendar/screens/Calendar/styles.ts",
  "src/hooks/useHaptics.ts",
  "docs/notes.md",
];

describe("kebab-case-files", () => {
  test("renames source paths but keeps routes, mocks, and reserved names", () => {
    expect(FILES.map(toKebabPath)).toEqual([
      "src/app/(app)/days/[date].tsx",
      "src/__mocks__/@expo/ui/jetpack-compose.js",
      "src/components/clock.ios.tsx",
      "src/components/clock.tsx",
      "src/components/__tests__/clock.tsx",
      "src/features/calendar/screens/calendar/index.tsx",
      "src/features/calendar/screens/calendar/styles.ts",
      "src/hooks/use-haptics.ts",
      "docs/notes.md",
    ]);
  });

  test("rewrites relative, alias, platform, folder, and jest.mock specifiers", () => {
    const map = buildRenameMap(FILES);
    const source = [
      'import Clock from "../Clock";',
      'jest.mock("@/hooks/useHaptics");',
      'import Calendar from "@/features/calendar/screens/Calendar";',
      'import { styles } from "@/features/calendar/screens/Calendar/styles";',
    ].join("\n");

    expect(
      rewriteContent(source, "src/components/__tests__/Clock.tsx", map)
    ).toBe(
      [
        'import Clock from "../clock";',
        'jest.mock("@/hooks/use-haptics");',
        'import Calendar from "@/features/calendar/screens/calendar";',
        'import { styles } from "@/features/calendar/screens/calendar/styles";',
      ].join("\n")
    );
  });

  test("rewrites repo paths in docs only when the path exists", () => {
    const map = buildRenameMap(FILES);
    const doc =
      "See [`useHaptics.ts`](../src/hooks/useHaptics.ts). Old: src/screens/Settings/index.tsx";

    expect(rewriteContent(doc, "docs/notes.md", map)).toBe(
      "See [`use-haptics.ts`](../src/hooks/use-haptics.ts). Old: src/screens/Settings/index.tsx"
    );
  });

  test("changes nothing on a second run", () => {
    const map = buildRenameMap(FILES);
    const source = 'import Clock from "../Clock";\n// src/hooks/useHaptics.ts';
    const once = rewriteContent(
      source,
      "src/components/__tests__/Clock.tsx",
      map
    );
    const renamed = FILES.map(toKebabPath);

    expect(buildRenameMap(renamed).size).toBe(0);
    expect(
      rewriteContent(
        once,
        "src/components/__tests__/clock.tsx",
        buildRenameMap(renamed)
      )
    ).toBe(once);
  });

  test("reports names that differ only in case", () => {
    expect(
      findCollisions(["src/lib/PullToSearch.tsx", "src/lib/pullToSearch.tsx"])
    ).toEqual([["src/lib/PullToSearch.tsx", "src/lib/pullToSearch.tsx"]]);
  });
});
