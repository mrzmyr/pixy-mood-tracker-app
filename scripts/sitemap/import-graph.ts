// What a route can draw: the top-level statements its files reach, like a
// bundler's tree shaking. Input hashes count these statements, so a change
// recaptures only the states that can show it.
//
// `import { A } from "@/features/x"` follows the barrel's
// `export { A } from "./a"` to `a.ts` and counts the statement that declares
// `A`, the statements `A` reads, and what those import. Statements that are
// not declarations run on load and always count. Type declarations and
// comments between statements never count. Metro still evaluates the rest;
// it draws nothing.
import crypto from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";

import { parseSync, Visitor } from "oxc-parser";
import type {
  Argument,
  BindingPattern,
  BindingRestElement,
  Declaration,
  Directive,
  Expression,
  JSXElement,
  ModuleDeclaration,
  Statement,
} from "oxc-parser";
import { z } from "zod";

import { CliError } from "../cli/shared.ts";
import type { Platform } from "./profile.ts";

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".cjs"];
/** Metro resolution order: platform file, native file, plain file. */
const resolveSuffixes = (platform: Platform) => [
  "",
  `.${platform}.tsx`,
  `.${platform}.ts`,
  ".native.tsx",
  ".native.ts",
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".json",
  `/index.${platform}.tsx`,
  "/index.tsx",
  "/index.ts",
  "/index.js",
];

const CaptureStubs = z.record(z.string(), z.record(z.string(), z.string()));
/** Imports capture bundles replace, shared with metro.config.js. */
const CAPTURE_STUBS = CaptureStubs.parse(
  createRequire(import.meta.url)("./capture-stubs.cjs")
);
const stubFor = (from: string, spec: string) =>
  CAPTURE_STUBS[from]?.[spec] ?? null;

/** Every export of a module: `import * as x`, `require()`, `import "x"`. */
const ALL = "*";
/** Local name of an anonymous `export default <expression>`. */
const DEFAULT_LOCAL = "*default*";
/** Layout files: their `<Stack.Screen name>` elements count per route. */
const LAYOUT_FILE = /^src\/app\/(?:.+\/)?_layout\.tsx?$/u;

/** A name asked of a module, and the one property read of it, if any. */
interface Request {
  spec: string;
  name: string;
  member?: string;
}

interface Span {
  start: number;
  end: number;
}

/** An identifier: `member` is the property when it is read as `x.member`. */
interface Ident {
  name: string;
  start: number;
  member: string | null;
}

interface Positioned {
  value: string;
  start: number;
}

/** One top-level statement of a source file. */
interface Unit extends Span {
  /** Local names it declares. */
  declares: string[];
  /** Identifiers in it: an over-approximation, property keys included. */
  idents: Ident[];
  /** Not a declaration: it runs whenever the module loads. */
  onLoad: boolean;
  /** `require()` and `import()` inside it. */
  requires: Positioned[];
  /** String literals: translation keys and flag keys come from here. */
  strings: Positioned[];
  /** Static heads of template literals and `"a_" + b`: key prefixes. */
  prefixes: Positioned[];
}

/** Import and export records of one source file. */
interface ModuleRecord {
  code: string;
  units: Unit[];
  /** Local binding of a value import to its source module and name. */
  bindings: Map<string, Request>;
  /** Side-effect imports: `import "x"`. */
  sideEffects: Request[];
  /** Export name to the local name its own code defines. */
  locals: Map<string, string>;
  /** `export { a as b } from`: export name to source module and name. */
  reexports: Map<string, Request>;
  /** `export * from` sources. */
  stars: string[];
  /** Local name to the statements that declare it. */
  declarers: Map<string, Unit[]>;
  /** `const x = require("m")`, also behind `cond ? … : null`: x to m. */
  aliases: Map<string, string>;
  /** `<Stack.Screen name="…">` elements of a layout file. */
  screens: (Span & { name: string })[];
  /** Layout files: `screenOptions` attributes, defaults of every screen. */
  screenDefaults: Span[];
  /** Layout files: every variable, also inside functions, to its spans. */
  variables: Map<string, Span[]>;
}

const LiteralString = z.string();

/** String value of a string literal node, else null. */
const stringOf = (node: Expression | Argument | null | undefined) =>
  node?.type === "Literal"
    ? (LiteralString.safeParse(node.value).data ?? null)
    : null;

/** Module a `require("m")` call loads, else null. */
const requireOf = (node: Expression | null | undefined) =>
  node?.type === "CallExpression" &&
  node.callee.type === "Identifier" &&
  node.callee.name === "require"
    ? stringOf(node.arguments[0])
    : null;

/** Module of `require("m")` or `cond ? require("m") : null`, else null. */
const aliasOf = (init: Expression | null) => {
  if (init?.type !== "ConditionalExpression") {
    return requireOf(init);
  }
  const { consequent, alternate } = init;
  if (alternate.type === "Literal" && alternate.value === null) {
    return requireOf(consequent);
  }
  return consequent.type === "Literal" && consequent.value === null
    ? requireOf(alternate)
    : null;
};

/** Exported or imported name of an oxc module record entry. */
const nameOf = (entry: { kind: string; name: string | null }) =>
  entry.kind === "Default" ? "default" : entry.name;

/** Names a binding pattern declares: `a`, `{ a, b: c }`, `[d, ...e]`. */
const patternNames = (
  pattern: BindingPattern | BindingRestElement
): string[] => {
  switch (pattern.type) {
    case "Identifier": {
      return [pattern.name];
    }
    case "AssignmentPattern": {
      return patternNames(pattern.left);
    }
    case "RestElement": {
      return patternNames(pattern.argument);
    }
    case "ArrayPattern": {
      return pattern.elements.flatMap((element) =>
        element ? patternNames(element) : []
      );
    }
    default: {
      return pattern.properties.flatMap((property) =>
        patternNames(property.type === "Property" ? property.value : property)
      );
    }
  }
};

const TYPE_ONLY = new Set([
  "TSTypeAliasDeclaration",
  "TSInterfaceDeclaration",
  "TSDeclareFunction",
]);

type TopLevel = Directive | Statement | ModuleDeclaration;

/** The declaration of an `export` statement, or the statement itself. */
const unwrapExport = (statement: TopLevel): TopLevel | Declaration | null => {
  if (statement.type !== "ExportNamedDeclaration") {
    return statement;
  }
  return statement.exportKind === "type" ? null : statement.declaration;
};

/**
 * Local names a top-level statement declares, or null for a statement that
 * draws nothing: imports, types, `export { a }` lists.
 */
const declaredBy = (statement: TopLevel) => {
  const node = unwrapExport(statement);
  if (
    !node ||
    node.type === "ImportDeclaration" ||
    node.type === "ExportAllDeclaration" ||
    TYPE_ONLY.has(node.type) ||
    ("declare" in node && node.declare)
  ) {
    return null;
  }
  if (node.type === "ExportDefaultDeclaration") {
    const value = node.declaration;
    const named =
      (value.type === "FunctionDeclaration" ||
        value.type === "ClassDeclaration") &&
      value.id;
    return named ? [DEFAULT_LOCAL, named.name] : [DEFAULT_LOCAL];
  }
  if (node.type === "VariableDeclaration") {
    return node.declarations.flatMap((declarator) =>
      patternNames(declarator.id)
    );
  }
  if (
    (node.type === "FunctionDeclaration" ||
      node.type === "ClassDeclaration" ||
      node.type === "TSEnumDeclaration") &&
    node.id
  ) {
    return [node.id.name];
  }
  // Expression statements, ifs, loops: they run on load.
  return [];
};

/** Name of a `<X.Screen name="literal">` element, else null. */
const screenNameOf = (node: JSXElement) => {
  const { name, attributes } = node.openingElement;
  if (name.type !== "JSXMemberExpression" || name.property.name !== "Screen") {
    return null;
  }
  for (const attribute of attributes) {
    if (
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === "name" &&
      attribute.value?.type === "Literal"
    ) {
      return stringOf(attribute.value);
    }
  }
  return null;
};

const emptyRecord = (code: string): ModuleRecord => ({
  code,
  units: [],
  bindings: new Map(),
  sideEffects: [],
  locals: new Map(),
  reexports: new Map(),
  stars: [],
  declarers: new Map(),
  aliases: new Map(),
  screens: [],
  screenDefaults: [],
  variables: new Map(),
});

/** Import and export entries of the oxc module record. */
const readModuleRecord = (
  record: ModuleRecord,
  module: ReturnType<typeof parseSync>["module"]
) => {
  for (const item of module.staticImports) {
    const spec = item.moduleRequest.value;
    if (item.entries.length === 0) {
      record.sideEffects.push({ spec, name: ALL });
    }
    for (const entry of item.entries.filter(({ isType }) => !isType)) {
      record.bindings.set(entry.localName.value, {
        spec,
        name:
          entry.importName.kind === "NamespaceObject"
            ? ALL
            : (nameOf(entry.importName) ?? ALL),
      });
    }
  }
  for (const entry of module.staticExports.flatMap((item) => item.entries)) {
    const exportName = nameOf(entry.exportName);
    if (entry.isType) {
      continue;
    }
    // `export * from` has no export name: check it before the name.
    if (entry.moduleRequest && entry.importName.kind === "AllButDefault") {
      record.stars.push(entry.moduleRequest.value);
    } else if (!exportName) {
      continue;
    } else if (entry.moduleRequest) {
      record.reexports.set(exportName, {
        spec: entry.moduleRequest.value,
        name:
          entry.importName.kind === "All"
            ? ALL
            : (nameOf(entry.importName) ?? ALL),
      });
    } else {
      record.locals.set(exportName, entry.localName.name ?? DEFAULT_LOCAL);
    }
  }
};

/** Parses one file into its module record. */
const readModule = (file: string, code: string): ModuleRecord => {
  const parsed = parseSync(file, code);
  if (parsed.errors.length > 0) {
    throw new CliError({
      status: "import_scan_failed",
      message: `Could not read imports of ${file}`,
      why: parsed.errors[0].message,
      fix: "Fix the syntax error in that file, then retry.",
    });
  }
  const record = emptyRecord(code);
  readModuleRecord(record, parsed.module);
  // Statements in source order; nodes find theirs by start offset.
  const statements = parsed.program.body;
  const starts = statements.map((statement) => statement.start);
  const units = statements.map((statement): Unit | null => {
    const declares = declaredBy(statement);
    const node = unwrapExport(statement);
    if (node?.type === "VariableDeclaration") {
      for (const { id, init } of node.declarations) {
        const spec = id.type === "Identifier" ? aliasOf(init) : null;
        if (spec && id.type === "Identifier") {
          record.aliases.set(id.name, spec);
        }
      }
    }
    return declares === null
      ? null
      : {
          start: statement.start,
          end: statement.end,
          declares,
          idents: [],
          onLoad: declares.length === 0,
          requires: [],
          strings: [],
          prefixes: [],
        };
  });
  const unitAt = (offset: number) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (starts[middle] <= offset) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return units[low] ?? null;
  };
  const addAt = (
    list: "requires" | "strings" | "prefixes",
    start: number,
    value: string | null
  ) => {
    if (value) {
      unitAt(start)?.[list].push({ value, start });
    }
  };
  const memberAt = new Map<number, string>();
  const isLayout = LAYOUT_FILE.test(file);
  new Visitor({
    MemberExpression: (node) => {
      if (
        !node.computed &&
        node.object.type === "Identifier" &&
        node.property.type === "Identifier"
      ) {
        memberAt.set(node.object.start, node.property.name);
      }
    },
    Identifier: (node) =>
      unitAt(node.start)?.idents.push({
        name: node.name,
        start: node.start,
        member: memberAt.get(node.start) ?? null,
      }),
    JSXIdentifier: (node) =>
      unitAt(node.start)?.idents.push({
        name: node.name,
        start: node.start,
        member: null,
      }),
    JSXElement: (node) => {
      const name = isLayout ? screenNameOf(node) : null;
      if (name !== null) {
        record.screens.push({ name, start: node.start, end: node.end });
      }
    },
    JSXAttribute: (node) => {
      if (
        isLayout &&
        node.name.type === "JSXIdentifier" &&
        node.name.name === "screenOptions"
      ) {
        record.screenDefaults.push({ start: node.start, end: node.end });
      }
    },
    VariableDeclarator: (node) => {
      if (isLayout && node.id.type === "Identifier") {
        const spans = record.variables.get(node.id.name) ?? [];
        record.variables.set(node.id.name, [
          ...spans,
          { start: node.start, end: node.end },
        ]);
      }
    },
    Literal: (node) => addAt("strings", node.start, stringOf(node)),
    CallExpression: (node) => addAt("requires", node.start, requireOf(node)),
    ImportExpression: (node) =>
      addAt("requires", node.start, stringOf(node.source)),
    TemplateLiteral: (node) =>
      addAt(
        node.quasis.length === 1 ? "strings" : "prefixes",
        node.start,
        node.quasis[0]?.value.cooked ?? null
      ),
    BinaryExpression: (node) =>
      addAt(
        "prefixes",
        node.start,
        node.operator === "+" ? stringOf(node.left) : null
      ),
  }).visit(parsed.program);
  record.units = units.filter((unit): unit is Unit => unit !== null);
  for (const unit of record.units) {
    for (const name of unit.declares) {
      record.declarers.set(name, [...(record.declarers.get(name) ?? []), unit]);
    }
  }
  return record;
};

/** Reads a checkout file. */
export type ReadFile = (file: string) => string;

/** What a set of entries needs: per file, a content hash, and its strings. */
export interface Closure {
  /** File to the hash of the part the entries reach, sorted by file. */
  files: Map<string, string>;
  /** String literals of the reached statements. */
  strings: Set<string>;
  /** Template and `+` heads of the reached statements. */
  prefixes: Set<string>;
}

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

/** Removes spans from a unit's text; offsets are file offsets. */
const textWithout = (code: string, unit: Unit, spans: Span[]) => {
  let text = "";
  let cursor = unit.start;
  const within = spans
    .filter(({ start, end }) => start >= unit.start && end <= unit.end)
    .toSorted((a, b) => a.start - b.start);
  for (const span of within) {
    if (span.end > cursor) {
      text += code.slice(cursor, Math.max(cursor, span.start));
      cursor = span.end;
    }
  }
  return text + code.slice(cursor, unit.end);
};

/** Native stack presentations that leave the screen below visible. */
const MODAL_PRESENTATION =
  /presentation:\s*["'](?:modal|formSheet|pageSheet|transparentModal|containedModal|containedTransparentModal)["']/u;

/**
 * Whether a layout's `<Stack.Screen name>` belongs to a route file on
 * screen: `settings/orbit` for `settings/orbit.tsx`, `(app)` for any file
 * in `(app)/`. `index` opens at launch and always counts.
 */
const screenIsShown = (layout: string, name: string, routes: string[]) =>
  name === "index" ||
  routes.some((route) => {
    const relative = path.posix
      .relative(path.posix.dirname(layout), route)
      .replace(/\.[^./]+$/u, "");
    return relative === name || relative.startsWith(`${name}/`);
  });

const HOOK_CALL = /\buse[A-Z]\w*\s*\(/u;

const inside = (spans: Span[], start: number) =>
  spans.some((span) => start >= span.start && start < span.end);

/**
 * Adds layout variables that only hidden `<Stack.Screen>` elements read,
 * like `const orbitOptions = …` inside the layout component. Repeats until
 * nothing changes. Never hides a hook call: hooks run on every render.
 */
const hideUnusedVariables = (record: ModuleRecord, screens: Span[]) => {
  const idents = record.units.flatMap((unit) => unit.idents);
  const hidden = [...screens];
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, spans] of record.variables) {
      const isHidden = spans.every((span) => inside(hidden, span.start));
      const readsOutside = idents.some(
        (ident) =>
          ident.name === name &&
          !inside(spans, ident.start) &&
          !inside(hidden, ident.start)
      );
      const callsHook = spans.some((span) =>
        HOOK_CALL.test(record.code.slice(span.start, span.end))
      );
      if (!isHidden && !readsOutside && !callsHook) {
        hidden.push(...spans);
        changed = true;
      }
    }
  }
  return hidden;
};

/**
 * Import graph of tracked source files, resolved per export name and per
 * top-level statement, see the file comment.
 */
export const createImportGraph = (
  blobs: Map<string, string>,
  platform: Platform,
  read: ReadFile
) => {
  const suffixes = resolveSuffixes(platform);
  const records = new Map<string, ModuleRecord | null>();

  const resolve = (spec: string, from: string) => {
    const stub = stubFor(from, spec);
    if (stub && blobs.has(stub)) {
      return stub;
    }
    let base: string;
    if (spec.startsWith("@/")) {
      base = path.posix.join("src", spec.slice(2));
    } else if (spec.startsWith(".")) {
      base = path.posix.normalize(
        path.posix.join(path.posix.dirname(from), spec)
      );
    } else {
      // Packages: their lockfile entries are a shared input.
      return null;
    }
    return (
      suffixes
        .map((suffix) => `${base}${suffix}`)
        .find((candidate) => blobs.has(candidate)) ?? null
    );
  };

  /** Module record of a source file; null for JSON, images, and text. */
  const recordOf = (file: string) => {
    if (!records.has(file)) {
      records.set(
        file,
        SOURCE_EXTENSIONS.includes(path.extname(file))
          ? readModule(file, read(file))
          : null
      );
    }
    return records.get(file) ?? null;
  };

  const exportCache = new Map<string, Set<string>>();
  /** Every name a module exports, through `export *`. */
  const exportsOf = (file: string, seen = new Set<string>()) => {
    const cached = exportCache.get(file);
    if (cached) {
      return cached;
    }
    const names = new Set<string>();
    const record = recordOf(file);
    if (record && !seen.has(file)) {
      seen.add(file);
      for (const name of [
        ...record.locals.keys(),
        ...record.reexports.keys(),
      ]) {
        names.add(name);
      }
      for (const spec of record.stars) {
        const target = resolve(spec, file);
        for (const name of target ? exportsOf(target, seen) : []) {
          if (name !== "default") {
            names.add(name);
          }
        }
      }
    }
    exportCache.set(file, names);
    return names;
  };

  /**
   * What the entries need; each entry counts as a whole. `shown`: route
   * files on screen, whose `<Stack.Screen>` elements count in layouts.
   */
  const closure = (entries: string[], shown = entries): Closure => {
    /** Statements reached, and statements counted as text only. */
    const reached = new Map<string, Set<Unit>>();
    const textOnly = new Map<string, Set<Unit>>();
    const plain = new Set<string>();
    const seen = new Set<string>();
    const queue: (Request & { file: string })[] = entries.map((file) => ({
      file,
      spec: file,
      name: ALL,
    }));

    /** Spans of a file that draw nothing for these routes. */
    const hiddenCache = new Map<string, Span[]>();
    const hiddenOf = (file: string, record: ModuleRecord) => {
      let hidden = hiddenCache.get(file);
      if (!hidden) {
        hidden = hideUnusedVariables(
          record,
          record.screens.filter(
            (screen) => !screenIsShown(file, screen.name, shown)
          )
        );
        hiddenCache.set(file, hidden);
      }
      return hidden;
    };
    const visible =
      (hidden: Span[]) =>
      ({ start }: { start: number }) =>
        !hidden.some((span) => start >= span.start && start < span.end);

    const ask = (from: string, request: Request) => {
      const target = resolve(request.spec, from);
      if (target !== null) {
        queue.push({ ...request, file: target });
      }
    };
    /** Asks for each import a unit reads; `x.a` only asks for `a` of x. */
    const askImports = (
      file: string,
      record: ModuleRecord,
      idents: Ident[]
    ) => {
      const byName = Map.groupBy(idents, (ident) => ident.name);
      for (const [name, uses] of byName) {
        const binding = record.bindings.get(name);
        const members = uses.map((use) => use.member);
        if (!binding) {
          continue;
        }
        if (members.every((member) => member !== null)) {
          for (const member of new Set(members)) {
            ask(file, { ...binding, member: member ?? undefined });
          }
        } else {
          ask(file, binding);
        }
      }
    };
    /** Counts statements, the statements they read, and their imports. */
    const reach = (file: string, record: ModuleRecord, first: Unit[]) => {
      let done = reached.get(file);
      const pending = [...first];
      if (!done) {
        done = new Set();
        reached.set(file, done);
        // Loading the module runs its side effects.
        pending.push(...record.units.filter((unit) => unit.onLoad));
        for (const request of record.sideEffects) {
          ask(file, request);
        }
      }
      const isVisible = visible(hiddenOf(file, record));
      for (let unit = pending.pop(); unit; unit = pending.pop()) {
        if (done.has(unit)) {
          continue;
        }
        done.add(unit);
        for (const { value } of unit.requires.filter(isVisible)) {
          ask(file, { spec: value, name: ALL });
        }
        const idents = unit.idents.filter(isVisible);
        askImports(file, record, idents);
        for (const { name } of idents) {
          pending.push(...(record.declarers.get(name) ?? []));
        }
      }
    };
    /** `x.member` of `export const x = require("m")`: counts x's text, asks m. */
    const reachMember = (
      file: string,
      record: ModuleRecord,
      local: string,
      member: string
    ) => {
      const spec = record.aliases.get(local);
      if (spec === undefined) {
        return false;
      }
      const units = textOnly.get(file) ?? new Set();
      textOnly.set(file, units);
      for (const unit of record.declarers.get(local) ?? []) {
        units.add(unit);
      }
      ask(file, { spec, name: member });
      return true;
    };

    /** Counts what one export of a module needs. */
    const answer = (
      file: string,
      record: ModuleRecord,
      name: string,
      member: string | undefined
    ) => {
      const reexport = record.reexports.get(name);
      const local = record.locals.get(name);
      if (name === ALL) {
        // Importers and the router see exports only: count those.
        const locals = [...record.locals.values()];
        reach(
          file,
          record,
          locals.flatMap((one) => record.declarers.get(one) ?? [])
        );
        for (const one of locals) {
          const binding = record.bindings.get(one);
          if (binding) {
            ask(file, binding);
          }
        }
        for (const request of record.reexports.values()) {
          ask(file, request);
        }
        for (const spec of record.stars) {
          ask(file, { spec, name: ALL });
        }
      } else if (reexport) {
        ask(file, { ...reexport, member });
      } else if (local === undefined) {
        const star = record.stars
          .map((spec) => resolve(spec, file))
          .find((target) => target !== null && exportsOf(target).has(name));
        // A name no export provides: count the whole module, never miss it.
        queue.push(
          star
            ? { file: star, spec: star, name, member }
            : { file, spec: file, name: ALL }
        );
      } else if (
        member === undefined ||
        !reachMember(file, record, local, member)
      ) {
        const binding = record.bindings.get(local);
        if (binding) {
          // `import { a } from "./a"; export { a }`
          ask(file, { ...binding, member });
        }
        reach(file, record, [...(record.declarers.get(local) ?? [])]);
      }
    };

    for (let item = queue.pop(); item; item = queue.pop()) {
      const { file, member } = item;
      // `import * as x` then `x.a`: asks for `a`.
      const name = item.name === ALL && member ? member : item.name;
      const nextMember = item.name === ALL ? undefined : member;
      const key = `${file}#${name}#${nextMember ?? ""}`;
      const record = seen.has(key) ? undefined : recordOf(file);
      seen.add(key);
      if (record === null) {
        plain.add(file);
      } else if (record) {
        answer(file, record, name, nextMember);
      }
    }

    const files = new Map<string, string>();
    const strings = new Set<string>();
    const prefixes = new Set<string>();
    for (const file of plain) {
      files.set(file, blobs.get(file) ?? "missing");
    }
    for (const file of new Set([...reached.keys(), ...textOnly.keys()])) {
      const record = recordOf(file);
      if (!record) {
        continue;
      }
      const hidden = hiddenOf(file, record);
      const isVisible = visible(hidden);
      const counted = new Set([
        ...(reached.get(file) ?? []),
        ...(textOnly.get(file) ?? []),
      ]);
      const units = record.units.filter((unit) => counted.has(unit));
      files.set(
        file,
        sha256(
          units.map((unit) => textWithout(record.code, unit, hidden)).join("\n")
        )
      );
      for (const unit of units.filter((one) => reached.get(file)?.has(one))) {
        for (const { value } of unit.strings.filter(isVisible)) {
          strings.add(value);
        }
        for (const { value } of unit.prefixes.filter(isVisible)) {
          prefixes.add(value);
        }
      }
    }
    return {
      files: new Map(
        [...files.entries()].toSorted(([a], [b]) => a.localeCompare(b))
      ),
      strings,
      prefixes,
    };
  };

  /**
   * Whether a route opens as a sheet over the screen below, so that screen
   * shows at the top. Reads the route's `<Stack.Screen>` options and
   * `screenOptions` in the layout, through variables of the layout and one
   * import. No `<Stack.Screen>` for the route: modal, the safe answer.
   */
  const isModal = (layout: string, route: string) => {
    const record = recordOf(layout);
    const screen = record?.screens
      .filter(
        (one) =>
          one.name !== "index" && screenIsShown(layout, one.name, [route])
      )
      .toSorted((a, b) => b.name.length - a.name.length)[0];
    if (!record || !screen) {
      return true;
    }
    const idents = record.units.flatMap((unit) => unit.idents);
    const texts: string[] = [];
    const seenNames = new Set<string>();
    const pending: Span[] = [screen, ...record.screenDefaults];
    for (let span = pending.pop(); span; span = pending.pop()) {
      const { start, end } = span;
      texts.push(record.code.slice(start, end));
      for (const { name } of idents.filter(
        (ident) => ident.start >= start && ident.start < end
      )) {
        if (seenNames.has(name)) {
          continue;
        }
        seenNames.add(name);
        pending.push(...(record.variables.get(name) ?? []));
        const binding = record.bindings.get(name);
        const target = binding ? resolve(binding.spec, layout) : null;
        const imported = target ? recordOf(target) : null;
        const local = imported?.locals.get(binding?.name ?? "");
        for (const unit of imported?.declarers.get(local ?? "") ?? []) {
          texts.push(imported?.code.slice(unit.start, unit.end) ?? "");
        }
      }
    }
    return texts.some((text) => MODAL_PRESENTATION.test(text));
  };

  return { closure, isModal };
};
