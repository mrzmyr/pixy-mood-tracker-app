// The graph decides which statements a route reaches. A statement it misses
// serves a stale screenshot; one it adds recaptures for nothing.
import { describe, expect, test } from "bun:test";

import { createImportGraph } from "./import-graph.ts";

const ROUTE = "src/app/route.tsx";

const BASE = {
  [ROUTE]: `import { A } from "@/lib";\nexport default () => A;\n`,
  "src/lib/index.ts": `export * from "./a";\nexport * from "./b";\n`,
  "src/lib/a.ts": `export const A = "a";\nexport const unused = "x";\n`,
  "src/lib/b.ts": `export const B = "b";\n`,
} satisfies Record<string, string>;

/** Hash per file of what the route reaches, with some files replaced. */
const reach = (changes: Record<string, string> = {}) => {
  const files = new Map(Object.entries({ ...BASE, ...changes }));
  const blobs = new Map([...files.keys()].map((file) => [file, file]));
  const graph = createImportGraph(
    blobs,
    "ios",
    (file) => files.get(file) ?? ""
  );
  return JSON.stringify([...graph.closure([ROUTE]).files]);
};

describe("import graph", () => {
  const base = reach();

  test("follows a name through export *", () => {
    expect(reach({ "src/lib/a.ts": `export const A = "changed";\n` })).not.toBe(
      base
    );
  });

  test("ignores another module of the same star barrel", () => {
    expect(reach({ "src/lib/b.ts": `export const B = "changed";\n` })).toBe(
      base
    );
  });

  test("ignores an unread export of a reached module", () => {
    const edit = `export const A = "a";\nexport const unused = "changed";\n`;
    expect(reach({ "src/lib/a.ts": edit })).toBe(base);
  });

  test("counts statements that run on load in a reached module", () => {
    const edit = `export const A = "a";\nexport const unused = "x";\nglobalThis.x = 1;\n`;
    expect(reach({ "src/lib/a.ts": edit })).not.toBe(base);
  });
});
