const { readFileSync } = require("node:fs");
const path = require("node:path");

const getFunctionName = (node) => {
  if (node.id?.type === "Identifier") {
    return node.id.name;
  }

  const { parent } = node;

  if (
    parent?.type === "VariableDeclarator" &&
    parent.id.type === "Identifier"
  ) {
    return parent.id.name;
  }

  if (
    (parent?.type === "MethodDefinition" || parent?.type === "Property") &&
    parent.key.type === "Identifier"
  ) {
    return parent.key.name;
  }
};

const getDeclaredBooleanType = (node) => {
  const annotation = node.returnType?.typeAnnotation;

  if (annotation?.type === "TSBooleanKeyword") {
    return true;
  }

  return (
    annotation?.type === "TSUnionType" &&
    annotation.types.some((type) => type.type === "TSBooleanKeyword")
  );
};

const hasJsDoc = (context, node) =>
  context.sourceCode
    .getCommentsBefore(node)
    .some(
      (comment) => comment.type === "Block" && comment.value.startsWith("*")
    );

const requireExportedJsDoc = {
  meta: {
    type: "problem",
    docs: {
      description: "Require JSDoc on exported declarations",
    },
    messages: {
      missing:
        "Add JSDoc to this exported declaration. Document its invariant, limitation, or constraint.",
    },
    schema: [],
  },
  create(context) {
    const check = (node) => {
      if (!hasJsDoc(context, node)) {
        context.report({ messageId: "missing", node });
      }
    };

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          check(node);
        }
      },
      ExportDefaultDeclaration(node) {
        if (node.declaration.type !== "Identifier") {
          check(node);
        }
      },
    };
  },
};

const booleanFunctionPrefix = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require boolean-returning functions to use a boolean prefix",
    },
    messages: {
      prefix:
        "Boolean-returning function `{{name}}` must start with is, has, can, should, was, or will.",
    },
    schema: [],
  },
  create(context) {
    const check = (node) => {
      const name = getFunctionName(node);

      if (
        name &&
        getDeclaredBooleanType(node) &&
        !/^(?:is|has|can|should|was|will)[A-Z_]/u.test(name)
      ) {
        context.report({
          messageId: "prefix",
          node,
          data: { name },
        });
      }
    };

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};

const structuredThrownErrors = {
  meta: {
    type: "problem",
    docs: {
      description: "Require structured fields on directly thrown errors",
    },
    messages: {
      bare: "Thrown error must expose `status`, `message`, `why`, and `fix`.",
    },
    schema: [],
  },
  create(context) {
    return {
      ThrowStatement(node) {
        const { argument } = node;
        const isErrorConstructor =
          argument.type === "NewExpression" &&
          argument.callee.type === "Identifier" &&
          argument.callee.name === "Error";

        const isObjectWithoutFields =
          argument.type === "ObjectExpression" &&
          !["status", "message", "why", "fix"].every((field) =>
            argument.properties.some(
              (property) =>
                property.type === "Property" &&
                property.key.type === "Identifier" &&
                property.key.name === field
            )
          );

        if (isErrorConstructor || isObjectWithoutFields) {
          context.report({ messageId: "bare", node });
        }
      },
    };
  },
};

// ES2023 copy methods missing from the Hermes build React Native ships.
const HERMES_MISSING_ARRAY_METHODS = new Set([
  "toReversed",
  "toSorted",
  "toSpliced",
]);

const noHermesMissingArrayMethods = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow array methods that Hermes does not implement",
    },
    messages: {
      missing:
        "Hermes has no Array#{{name}}; it throws at runtime while Jest passes. Copy with spread first, for example `[...items].sort()`.",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        const { property } = node;
        if (
          !node.computed &&
          property.type === "Identifier" &&
          HERMES_MISSING_ARRAY_METHODS.has(property.name)
        ) {
          context.report({
            messageId: "missing",
            node: property,
            data: { name: property.name },
          });
        }
      },
    };
  },
};

// Intl constructors missing from Hermes. Hermes ships only Collator,
// DateTimeFormat, NumberFormat, and getCanonicalLocales. Calling one of these
// throws "undefined cannot be used as a constructor" (Android Reminder crash).
const HERMES_MISSING_INTL_APIS = new Set([
  "DisplayNames",
  "DurationFormat",
  "ListFormat",
  "Locale",
  "PluralRules",
  "RelativeTimeFormat",
  "Segmenter",
]);

const noHermesMissingIntl = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Intl APIs that Hermes does not implement",
    },
    messages: {
      missing:
        "Hermes has no Intl.{{name}}; it throws at runtime while Jest passes. Use a locale key or dayjs instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        const { object, property } = node;
        if (
          !node.computed &&
          object.type === "Identifier" &&
          object.name === "Intl" &&
          property.type === "Identifier" &&
          HERMES_MISSING_INTL_APIS.has(property.name)
        ) {
          context.report({
            messageId: "missing",
            node: property,
            data: { name: property.name },
          });
        }
      },
    };
  },
};

// LayoutAnimation.configureNext is global: it animates every pending layout
// change, including unrelated screen teardown, and crashed Fabric (#610).
const noLayoutAnimation = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow LayoutAnimation from react-native",
    },
    messages: {
      banned:
        "LayoutAnimation is global and crashed Fabric on screen close (#610). Use Reanimated `entering`, `exiting`, or `layout` props instead.",
    },
    schema: [],
  },
  create(context) {
    const reactNativeNames = new Set();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "react-native") {
          return;
        }
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") {
            reactNativeNames.add(specifier.local.name);
          } else if (
            (specifier.imported.name ?? specifier.imported.value) ===
            "LayoutAnimation"
          ) {
            context.report({ messageId: "banned", node: specifier });
          }
        }
      },
      MemberExpression(node) {
        if (
          !node.computed &&
          node.object.type === "Identifier" &&
          reactNativeNames.has(node.object.name) &&
          node.property.type === "Identifier" &&
          node.property.name === "LayoutAnimation"
        ) {
          context.report({ messageId: "banned", node: node.property });
        }
      },
    };
  },
};

// Handled errors go through src/lib/report-error.ts, so Sentry and Observe
// both see them and Observe never receives `why`.
const DIRECT_ERROR_REPORTERS = {
  "@sentry/react-native": { exportName: null, method: "captureException" },
  "expo-observe": { exportName: "Observe", method: "reportError" },
};

const noDirectErrorReporting = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Sentry.captureException and Observe.reportError outside reportError",
    },
    messages: {
      banned:
        "Call `reportError` from `@/lib/report-error` so Sentry and Observe both get the error.",
    },
    schema: [],
  },
  create(context) {
    // Local name of the object that holds the banned method, mapped to it.
    const reporterNames = new Map();

    return {
      ImportDeclaration(node) {
        const reporter = DIRECT_ERROR_REPORTERS[node.source.value];
        if (!reporter) {
          return;
        }
        for (const specifier of node.specifiers) {
          const imported =
            specifier.type === "ImportSpecifier"
              ? (specifier.imported.name ?? specifier.imported.value)
              : null;
          if (reporter.exportName === null && imported === null) {
            reporterNames.set(specifier.local.name, reporter.method);
          } else if (imported === reporter.exportName) {
            reporterNames.set(specifier.local.name, reporter.method);
          } else if (
            reporter.exportName === null &&
            imported === reporter.method
          ) {
            context.report({ messageId: "banned", node: specifier });
          }
        }
      },
      MemberExpression(node) {
        if (
          !node.computed &&
          node.object.type === "Identifier" &&
          node.property.type === "Identifier" &&
          reporterNames.get(node.object.name) === node.property.name
        ) {
          context.report({ messageId: "banned", node: node.property });
        }
      },
    };
  },
};

// String literals are the only literals whose raw source starts with a quote.
const getStringValue = (element) =>
  element?.type === "Literal" && /^["']/u.test(element.raw)
    ? element.value
    : undefined;

// Sorted lists put new items at different lines, so parallel branches stop
// conflicting at the list end.
const sortedStringArrays = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require string literal arrays in code point order",
    },
    fixable: "code",
    messages: {
      unsorted:
        "Sort this list: {{previous}} comes after {{current}}. `bun run fix` sorts it.",
    },
    schema: [],
  },
  create(context) {
    return {
      ArrayExpression(node) {
        const values = node.elements.map(getStringValue);
        if (values.length < 2 || values.includes(undefined)) {
          return;
        }
        const index = values.findIndex(
          (value, position) => position > 0 && values[position - 1] > value
        );
        if (index === -1) {
          return;
        }
        const { sourceCode } = context;
        const sortedTexts = node.elements
          .map((element) => ({
            text: sourceCode.getText(element),
            value: element.value,
          }))
          .sort((a, b) => (a.value < b.value ? -1 : 1))
          .map(({ text }) => text);
        context.report({
          messageId: "unsorted",
          node: node.elements[index],
          data: { previous: values[index - 1], current: values[index] },
          fix: (fixer) =>
            node.elements.map((element, position) =>
              fixer.replaceText(element, sortedTexts[position])
            ),
        });
      },
    };
  },
};

// unicorn/filename-case checks file names only. This rule checks folders under `src/`.
// Tool-owned names stay: `__tests__`, `__mocks__`, `(group)`, `[param]`, `@scope`.
const KEBAB_FOLDER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const TOOL_OWNED_FOLDER = /^[_+[(@]/u;

const kebabCaseFolders = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require kebab-case folder names under src/",
    },
    messages: {
      folder:
        "Rename folder `{{name}}` to kebab-case. `bun scripts/codemods/kebab-case-files.ts` renames it and its imports.",
    },
    schema: [],
  },
  create(context) {
    const relative = path.relative(
      context.cwd ?? process.cwd(),
      context.filename
    );
    const [root, ...segments] = relative.split(path.sep);
    if (root !== "src") {
      return {};
    }
    const folder = segments
      .slice(0, -1)
      .find(
        (name) => !TOOL_OWNED_FOLDER.test(name) && !KEBAB_FOLDER.test(name)
      );
    if (folder === undefined) {
      return {};
    }
    return {
      Program(node) {
        context.report({ messageId: "folder", node, data: { name: folder } });
      },
    };
  },
};

// Modal routes show the native sheet bar on iOS (DESIGN.md "Components").
// `transparentModal` is left out: media overlays such as the photo viewer.
const MODAL_PRESENTATIONS = new Set([
  "modal",
  "formSheet",
  "pageSheet",
  "fullScreenModal",
  "containedModal",
]);

const getLiteralProperty = (node, name) =>
  node.properties.find(
    (property) =>
      property.type === "Property" &&
      property.key.type === "Identifier" &&
      property.key.name === name &&
      property.value.type === "Literal"
  )?.value.value;

const modalRouteShowsHeader = {
  meta: {
    type: "problem",
    docs: {
      description: "Forbid hidden headers on modal routes",
    },
    messages: {
      hidden:
        "Modal route hides the native bar. Use `getModalRouteOptions` and `RouteModalHeader` (DESIGN.md Components).",
    },
    schema: [],
  },
  create(context) {
    return {
      ObjectExpression(node) {
        if (
          MODAL_PRESENTATIONS.has(getLiteralProperty(node, "presentation")) &&
          getLiteralProperty(node, "headerShown") === false
        ) {
          context.report({ messageId: "hidden", node });
        }
      },
    };
  },
};

/** Import source as a repo path: `@/x` and `./x` become `src/...`, packages stay as they are. */
const toRepoPath = (source, fileDir) => {
  if (source.startsWith("@/")) {
    return `src/${source.slice(2)}`;
  }
  if (source.startsWith(".")) {
    return path.posix.join(fileDir, source);
  }
  return source;
};

const componentScope = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow a module, or some of its named exports, only in listed folders, so one component or icon keeps one use",
    },
    messages: {
      scope: "{{message}}",
    },
    schema: [
      {
        type: "object",
        properties: {
          modules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                importNames: { type: "array", items: { type: "string" } },
                allow: { type: "array", items: { type: "string" } },
                message: { type: "string" },
              },
              required: ["name", "allow", "message"],
            },
          },
        },
      },
    ],
  },
  create(context) {
    const modules = context.options[0]?.modules ?? [];
    const relative = path
      .relative(context.cwd ?? process.cwd(), context.filename)
      .split(path.sep)
      .join("/");
    const scoped = modules.filter(
      ({ allow }) => !allow.some((prefix) => relative.startsWith(prefix))
    );
    if (scoped.length === 0) {
      return {};
    }
    const fileDir = path.posix.dirname(relative);

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") {
          return;
        }
        const target = toRepoPath(node.source.value, fileDir);
        for (const { name, importNames, message } of scoped) {
          if (toRepoPath(name, fileDir) !== target) {
            continue;
          }
          if (!importNames) {
            context.report({
              messageId: "scope",
              data: { message },
              node: node.source,
            });
            continue;
          }
          for (const specifier of node.specifiers) {
            if (
              specifier.type === "ImportSpecifier" &&
              specifier.importKind !== "type" &&
              importNames.includes(
                specifier.imported.name ?? specifier.imported.value
              )
            ) {
              context.report({
                messageId: "scope",
                data: { message },
                node: specifier,
              });
            }
          }
        }
      },
    };
  },
};

const BUTTON_MODULES = new Set([
  "src/components/button",
  "src/components/link-button",
]);

const buttonLabelChildren = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a raw Text child in Button and LinkButton, which set the label and disabled color",
    },
    messages: {
      text: "Pass a label string, or `ButtonIcon` + `ButtonText` from `@/components/button-content`. A raw `Text` keeps its own color when the button is disabled.",
    },
    schema: [],
  },
  create(context) {
    const fileDir = path.posix.dirname(
      path
        .relative(context.cwd ?? process.cwd(), context.filename)
        .split(path.sep)
        .join("/")
    );
    const buttonNames = new Set();
    const textNames = new Set();

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        for (const specifier of node.specifiers) {
          if (
            BUTTON_MODULES.has(toRepoPath(source, fileDir)) &&
            specifier.type === "ImportDefaultSpecifier"
          ) {
            buttonNames.add(specifier.local.name);
          }
          if (
            source === "react-native" &&
            specifier.type === "ImportSpecifier" &&
            (specifier.imported.name ?? specifier.imported.value) === "Text"
          ) {
            textNames.add(specifier.local.name);
          }
        }
      },
      JSXElement(node) {
        const { name } = node.openingElement;
        if (name.type !== "JSXIdentifier" || !buttonNames.has(name.name)) {
          return;
        }
        for (const child of node.children) {
          if (
            child.type === "JSXElement" &&
            child.openingElement.name.type === "JSXIdentifier" &&
            textNames.has(child.openingElement.name.name)
          ) {
            context.report({ messageId: "text", node: child });
          }
        }
      },
    };
  },
};

/** Files that render a sheet or its header import one of these. */
const SHEET_MODULES = new Set([
  "src/components/sheet-modal",
  "src/components/modal-header",
]);

const KEYBOARD_LAYOUT_NAMES = new Set([
  "KeyboardAvoidingView",
  "useAnimatedKeyboard",
]);

const sheetKeyboardLayout = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow keyboard-driven layout in files that render a sheet",
    },
    messages: {
      keyboard:
        "Sheets do not move views on keyboard events. Put inputs at the top of the sheet.",
    },
    schema: [],
  },
  create(context) {
    const fileDir = path.posix.dirname(
      path
        .relative(context.cwd ?? process.cwd(), context.filename)
        .split(path.sep)
        .join("/")
    );
    const program = context.sourceCode.ast;
    const isSheet = program.body.some(
      (node) =>
        node.type === "ImportDeclaration" &&
        SHEET_MODULES.has(toRepoPath(node.source.value, fileDir))
    );
    if (!isSheet) {
      return {};
    }
    const keyboardNames = new Set();

    return {
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") {
            continue;
          }
          const imported = specifier.imported.name ?? specifier.imported.value;
          if (KEYBOARD_LAYOUT_NAMES.has(imported)) {
            context.report({ messageId: "keyboard", node: specifier });
          }
          if (node.source.value === "react-native" && imported === "Keyboard") {
            keyboardNames.add(specifier.local.name);
          }
        }
      },
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          keyboardNames.has(callee.object.name) &&
          callee.property.type === "Identifier" &&
          callee.property.name === "addListener"
        ) {
          context.report({ messageId: "keyboard", node: callee });
        }
      },
    };
  },
};

/** JSX elements in an attribute value, through `cond ? a : b` and `cond && a`. */
const getJsxValues = (expression) => {
  if (!expression) {
    return [];
  }
  if (expression.type === "JSXElement") {
    return [expression];
  }
  if (expression.type === "ConditionalExpression") {
    return [
      ...getJsxValues(expression.consequent),
      ...getJsxValues(expression.alternate),
    ];
  }
  if (expression.type === "LogicalExpression") {
    return getJsxValues(expression.right);
  }
  return [];
};

/** A spinner may replace a header button while its action runs. */
const HEADER_SLOT_NAMES = new Set(["HeaderButton", "ActivityIndicator"]);

const headerButtonOnly = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require HeaderButton in the left and right slots of ModalHeader",
    },
    messages: {
      slot: "Modal header buttons are `HeaderButton`. Its `kind` sets side, icon, and style.",
    },
    schema: [],
  },
  create(context) {
    const fileDir = path.posix.dirname(
      path
        .relative(context.cwd ?? process.cwd(), context.filename)
        .split(path.sep)
        .join("/")
    );
    const headerNames = new Set();

    return {
      ImportDeclaration(node) {
        if (
          toRepoPath(node.source.value, fileDir) !==
          "src/components/modal-header"
        ) {
          return;
        }
        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportDefaultSpecifier") {
            headerNames.add(specifier.local.name);
          }
        }
      },
      JSXOpeningElement(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          !headerNames.has(node.name.name)
        ) {
          return;
        }
        for (const attribute of node.attributes) {
          if (
            attribute.type !== "JSXAttribute" ||
            !["left", "right"].includes(attribute.name.name) ||
            attribute.value?.type !== "JSXExpressionContainer"
          ) {
            continue;
          }
          for (const element of getJsxValues(attribute.value.expression)) {
            const { name } = element.openingElement;
            if (
              name.type !== "JSXIdentifier" ||
              !HEADER_SLOT_NAMES.has(name.name)
            ) {
              context.report({ messageId: "slot", node: element });
            }
          }
        }
      },
    };
  },
};

const SHADING_METHODS = new Set([
  "darken",
  "brighten",
  "saturate",
  "desaturate",
]);

const noColorShading = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow chroma shading outside the color constants",
    },
    messages: {
      shade:
        "Get shades from the color scale (`scale[rating].border`) or add a token in `src/constants/colors`. Shading here drifts from the scale.",
    },
    schema: [],
  },
  create(context) {
    let hasChroma = false;

    return {
      ImportDeclaration(node) {
        if (node.source.value === "chroma-js") {
          hasChroma = true;
        }
      },
      CallExpression(node) {
        const { callee } = node;
        if (
          hasChroma &&
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          SHADING_METHODS.has(callee.property.name)
        ) {
          context.report({ messageId: "shade", node: callee.property });
        }
      },
    };
  },
};

const RADIUS_KEY = /^border(?:\w*)Radius$/u;
/** Below `RADIUS.xs`: hairline rounding of small marks, no token. */
const RADIUS_LITERAL_MIN = 4;

const radiusToken = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require RADIUS tokens for corner radii of 4 and more",
    },
    messages: {
      literal:
        "Use a `RADIUS` step from `@/constants/radius`, picked by role. Circles use `size / 2`.",
    },
    schema: [],
  },
  create(context) {
    return {
      Property(node) {
        const key = node.key.name ?? node.key.value;
        if (
          RADIUS_KEY.test(String(key)) &&
          node.value.type === "Literal" &&
          Number.isFinite(node.value.value) &&
          node.value.value >= RADIUS_LITERAL_MIN
        ) {
          context.report({ messageId: "literal", node: node.value });
        }
      },
    };
  },
};

const noReduceMotionNever = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow ReduceMotion.Never, which ignores the reduce motion setting",
    },
    messages: {
      never:
        "Animations follow the reduce motion setting. Use the default (`ReduceMotion.System`).",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          !node.computed &&
          node.object.type === "Identifier" &&
          node.object.name === "ReduceMotion" &&
          node.property.type === "Identifier" &&
          node.property.name === "Never"
        ) {
          context.report({ messageId: "never", node });
        }
      },
    };
  },
};

/** Chicago style keeps these lower case inside a title. */
const TITLE_SMALL_WORDS = new Set(
  "a an the and but or nor for so yet as at by in of off on per to up via vs".split(
    " "
  )
);

/** A full sentence (ends in . ? ! or starts with "I ") keeps sentence case. */
const isSentence = (text) => /[.?!]$/u.test(text) || text.startsWith("I ");

const isTitleCase = (text) => {
  const words = text
    .replaceAll(/\{\{[^}]+\}\}/gu, "X")
    .match(/[A-Za-z][A-Za-z'’-]*/gu);
  if (!words) {
    return true;
  }
  return words.every(
    (word, index) =>
      (index > 0 &&
        index < words.length - 1 &&
        TITLE_SMALL_WORDS.has(word.toLowerCase())) ||
      word[0] === word[0].toUpperCase()
  );
};

/** Elements whose text child is a label. */
const LABEL_CHILD_ELEMENTS = new Set(["Button", "LinkButton"]);
/** Element and attribute pairs that hold a label or title. */
const LABEL_ATTRIBUTES = new Map([
  ["HeaderButton", "label"],
  ["MenuListItem", "title"],
  ["RouteModalHeader", "title"],
  ["ModalHeader", "title"],
]);

const localeCache = new Map();
const readLocale = (file) => {
  if (!localeCache.has(file)) {
    localeCache.set(file, JSON.parse(readFileSync(file, "utf-8")));
  }
  return localeCache.get(file);
};

/** Key of `t("key")`, or `undefined`. */
const getTranslationKey = (node) =>
  node?.type === "CallExpression" &&
  node.callee.type === "Identifier" &&
  node.callee.name === "t" &&
  node.arguments[0]?.type === "Literal"
    ? node.arguments[0].value
    : undefined;

const titleCaseLabels = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require Title Case (Chicago) in English for headings, buttons, and modal titles",
    },
    messages: {
      title:
        'English `{{key}}` is a label: use Title Case ("{{text}}"). Full sentences ending in . ? ! keep sentence case.',
    },
    schema: [
      {
        type: "object",
        properties: { localeFile: { type: "string" } },
      },
    ],
  },
  create(context) {
    const localeFile = path.resolve(
      context.cwd ?? process.cwd(),
      context.options[0]?.localeFile ?? "assets/locales/en.json"
    );
    const locale = readLocale(localeFile);
    const check = (expression) => {
      const key = getTranslationKey(expression);
      const text = locale[key];
      if (text === undefined || isSentence(text) || isTitleCase(text)) {
        return;
      }
      context.report({
        messageId: "title",
        node: expression,
        data: { key, text },
      });
    };

    return {
      // Alert.alert(title, message, buttons): the title and button texts are labels.
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type !== "MemberExpression" ||
          callee.object.type !== "Identifier" ||
          callee.object.name !== "Alert" ||
          callee.property.type !== "Identifier" ||
          callee.property.name !== "alert"
        ) {
          return;
        }
        check(node.arguments[0]);
        for (const button of node.arguments[2]?.elements ?? []) {
          for (const property of button?.properties ?? []) {
            if (property.key?.name === "text") {
              check(property.value);
            }
          }
        }
      },
      JSXElement(node) {
        const opening = node.openingElement;
        if (opening.name.type !== "JSXIdentifier") {
          return;
        }
        const isHeading = opening.attributes.some(
          (attribute) =>
            attribute.type === "JSXAttribute" &&
            attribute.name.name === "accessibilityRole" &&
            attribute.value?.value === "header"
        );
        if (isHeading || LABEL_CHILD_ELEMENTS.has(opening.name.name)) {
          for (const child of node.children) {
            if (child.type === "JSXExpressionContainer") {
              check(child.expression);
            }
          }
        }
        const attributeName = LABEL_ATTRIBUTES.get(opening.name.name);
        for (const attribute of opening.attributes) {
          if (
            attribute.type === "JSXAttribute" &&
            attribute.name.name === attributeName &&
            attribute.value?.type === "JSXExpressionContainer"
          ) {
            check(attribute.value.expression);
          }
        }
      },
    };
  },
};

module.exports = {
  meta: { name: "pixy-standards" },
  rules: {
    "no-hermes-missing-array-methods": noHermesMissingArrayMethods,
    "no-hermes-missing-intl": noHermesMissingIntl,
    "no-layout-animation": noLayoutAnimation,
    "no-direct-error-reporting": noDirectErrorReporting,
    "require-exported-jsdoc": requireExportedJsDoc,
    "boolean-function-prefix": booleanFunctionPrefix,
    "structured-thrown-errors": structuredThrownErrors,
    "sorted-string-arrays": sortedStringArrays,
    "kebab-case-folders": kebabCaseFolders,
    "modal-route-shows-header": modalRouteShowsHeader,
    "component-scope": componentScope,
    "button-label-children": buttonLabelChildren,
    "sheet-keyboard-layout": sheetKeyboardLayout,
    "header-button-only": headerButtonOnly,
    "no-color-shading": noColorShading,
    "radius-token": radiusToken,
    "no-reduce-motion-never": noReduceMotionNever,
    "title-case-labels": titleCaseLabels,
  },
};
