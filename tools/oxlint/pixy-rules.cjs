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

module.exports = {
  meta: { name: "pixy-standards" },
  rules: {
    "no-hermes-missing-array-methods": noHermesMissingArrayMethods,
    "no-layout-animation": noLayoutAnimation,
    "require-exported-jsdoc": requireExportedJsDoc,
    "boolean-function-prefix": booleanFunctionPrefix,
    "structured-thrown-errors": structuredThrownErrors,
    "sorted-string-arrays": sortedStringArrays,
  },
};
