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

module.exports = {
  meta: { name: "pixy-standards" },
  rules: {
    "require-exported-jsdoc": requireExportedJsDoc,
    "boolean-function-prefix": booleanFunctionPrefix,
    "structured-thrown-errors": structuredThrownErrors,
  },
};
