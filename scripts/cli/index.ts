import { parseArgs } from "node:util";
import { APP } from "./app.ts";
import { BUILDS } from "./builds.ts";
import { E2E } from "./e2e.ts";
import { DEVICES } from "./devices.ts";
import { reportMemory } from "./memory.ts";
import { CliError } from "./shared.ts";
import type { CommandSpec, Noun, OptionSpec } from "./shared.ts";

const NOUNS = new Map<string, Noun>([
  ["app", APP],
  ["builds", BUILDS],
  ["e2e", E2E],
  ["devices", DEVICES],
]);
const ALIASES = new Map([
  ["ls", "list"],
  ["remove", "rm"],
]);
const choices = (spec: CommandSpec) =>
  Object.keys(spec.options ?? {}).map((key) => `--${key}`);
const optionLabel = (name: string, option: OptionSpec) =>
  option.value === undefined ? `--${name}` : `--${name}=${option.value}`;
const helpText = (noun: string, verb: string, spec: CommandSpec) => {
  const options = Object.entries(spec.options ?? {});
  const sections: string[] = [
    spec.summary,
    spec.usage ??
      `Usage: bun ${noun} ${verb}${spec.exactlyOne ? " (--platform=<ios|android> | --target=<target>)" : ""}${spec.options?.fixture ? " --fixture=<id>" : ""}${spec.options?.paths ? " [--paths=<path,...>]" : ""}${spec.options?.video ? " [--video]" : ""}${spec.options?.build ? " --build=<id>" : ""}`,
  ];
  if (options.length) {
    const width = Math.max(
      ...options.map(([name, option]) => optionLabel(name, option).length)
    );
    sections.push(
      `Options:\n${options.flatMap(([name, option]) => option.description.map((line, i) => `  ${i ? " ".repeat(width) : optionLabel(name, option).padEnd(width)}  ${line}`)).join("\n")}`
    );
  }
  for (const section of spec.sections ?? []) {
    sections.push(
      `${section.title}:\n${section.lines.map((line) => `  ${line}`).join("\n")}`
    );
  }
  if (spec.errors) {
    const entries = Object.entries(spec.errors);
    const width = Math.max(...entries.map(([key]) => key.length));
    sections.push(
      `Errors:\n${entries.map(([key, description]) => `  ${key.padEnd(width)}  ${description}`).join("\n")}`
    );
  }
  sections.push(
    `Exit codes: 0 ${spec.successWord ?? "ok"}, 1 failure, 2 usage error`
  );
  return sections.join("\n\n");
};
const nounHelp = (noun: string, spec: Noun) => {
  const width = Math.max(
    ...Object.keys(spec.commands).map((key) => key.length)
  );
  const entries = (spec.commandOrder ?? Object.keys(spec.commands)).map(
    (key) => [key, spec.commands[key]] as const
  );
  return [
    spec.summary,
    `Usage: bun ${noun} <command> [options]`,
    `Commands:\n${entries.map(([key, cmd]) => `  ${key.padEnd(width)}  ${cmd.summary.split(". ")[0].replace(/\.$/u, "")}`).join("\n")}`,
    ...(spec.helpTail ?? [`Run \`bun ${noun} <command> --help\` for details.`]),
  ].join("\n\n");
};
const usage = (
  noun: string,
  verb: string,
  status: string,
  message: string,
  why: string,
  fix: string
) =>
  new CliError({
    exitCode: 2,
    status,
    message,
    why,
    fix: fix.replaceAll("<noun>", noun).replaceAll("<verb>", verb),
  });
interface ParsedInvocation {
  noun: string;
  commandName: string;
  spec: CommandSpec;
  definitions: Record<string, { type: "string" | "boolean" }>;
  tokens: ReturnType<typeof parseArgs>["tokens"];
  positionals: string[];
  values: Record<string, string | undefined>;
}

/** Flags take no value; every other option needs one. */
const validateOptionValue = (
  {
    noun,
    commandName,
    spec,
    definitions,
  }: Pick<ParsedInvocation, "noun" | "commandName" | "spec" | "definitions">,
  name: string,
  value: string | undefined
) => {
  if (definitions[name]?.type === "boolean") {
    if (value !== undefined) {
      throw usage(
        noun,
        commandName,
        "unexpected_value",
        `Option --${name} takes no value`,
        `--${name} is a flag. Passing it turns it on.`,
        `Pass --${name} without "=".`
      );
    }
    return;
  }
  if (value === undefined || value === "") {
    throw usage(
      noun,
      commandName,
      "missing_value",
      `Option --${name} has no value`,
      `--${name} needs a value: --${name}=${spec.options?.[name]?.value}.`,
      `Run \`bun ${noun} ${commandName} --help\`.`
    );
  }
};

const validateTokens = ({
  noun,
  commandName,
  spec,
  definitions,
  tokens,
  positionals,
}: ParsedInvocation) => {
  for (const token of tokens) {
    if (
      token.kind === "option" &&
      !Object.hasOwn(definitions, token.name) &&
      token.name !== "help"
    ) {
      throw usage(
        noun,
        commandName,
        "invalid_option",
        `Unknown option "--${token.name}"`,
        `bun ${noun} ${commandName} accepts: ${choices(spec).join(", ") || "none"}.`,
        `Run \`bun ${noun} ${commandName} --help\`.`
      );
    }
  }
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (token.kind === "option" && token.name !== "help") {
      counts.set(token.name, (counts.get(token.name) ?? 0) + 1);
      validateOptionValue(
        { noun, commandName, spec, definitions },
        token.name,
        token.value
      );
    }
  }
  for (const [name, count] of counts) {
    if (count > 1) {
      throw usage(
        noun,
        commandName,
        "duplicate_option",
        `Option --${name} passed ${count} times`,
        "Every option is allowed once.",
        `Pass --${name} once.`
      );
    }
  }
  const [positional] = positionals;
  if (positional !== undefined) {
    const choiceName = Object.entries(spec.options ?? {}).find(([, value]) =>
      value.choices?.includes(positional)
    )?.[0];
    throw usage(
      noun,
      commandName,
      "unexpected_argument",
      `Unexpected argument "${positional}"`,
      `bun ${noun} ${commandName} takes options only, no positional arguments.`,
      choiceName
        ? `Pass --${choiceName}=${positional}.`
        : `Run \`bun ${noun} ${commandName} --help\`.`
    );
  }
};

const validateValues = ({
  noun,
  commandName,
  spec,
  values,
}: ParsedInvocation) => {
  // SAFETY: parser definitions include every declared string option.
  for (const [name, option] of Object.entries(spec.options ?? {})) {
    const value = values[name];
    if (value && option.choices && !option.choices.includes(value)) {
      const status = option.invalidStatus ?? "invalid_value";
      const data = {
        invalid_platform: [
          `Unknown platform "${values[name]}"`,
          "--platform accepts: ios, android.",
          "Pass --platform=ios or --platform=android.",
        ],
        fixture_not_found: [
          `Unknown fixture "${values[name]}"`,
          `--fixture accepts: ${option.choices.join(", ")}.`,
          "Pass one accepted value.",
        ],
      } satisfies Record<string, [string, string, string]>;
      const [message, why, fix] = data[status] ?? [
        `Invalid value "${values[name]}" for --${name}`,
        `--${name} accepts: ${option.choices.join(", ")}.`,
        "Pass one accepted value.",
      ];
      throw usage(noun, commandName, status, message, why, fix);
    }
  }
  for (const [name, option] of Object.entries(spec.options ?? {})) {
    if (option.isRequired && values[name] === undefined) {
      throw usage(
        noun,
        commandName,
        "missing_option",
        `Missing --${name}`,
        `bun ${noun} ${commandName} requires --${name}.`,
        `Pass --${name}=${option.value}.`
      );
    }
  }
  if (spec.exactlyOne) {
    const passed = spec.exactlyOne.filter((name) => values[name] !== undefined);
    if (passed.length > 1) {
      throw usage(
        noun,
        commandName,
        "conflicting_options",
        "Both --platform and --target passed",
        "Each option selects one device. Two devices per command are not allowed.",
        "Pass exactly one of --platform, --target."
      );
    }
    if (passed.length === 0) {
      throw usage(
        noun,
        commandName,
        "missing_option",
        "Missing --platform or --target",
        `bun ${noun} ${commandName} needs one device.`,
        `Pass --platform=<ios|android> for simulator or emulator, or --target=<target> for a phone. Run \`bun devices list\` to see both.`
      );
    }
  }
};

const runCommand = async ({
  noun,
  commandName,
  spec,
  argv,
}: {
  noun: string;
  commandName: string;
  spec: CommandSpec;
  argv: string[];
}) => {
  const definitions = Object.fromEntries(
    Object.entries(spec.options ?? {}).map(([key, option]) => [
      key,
      { type: option.value === undefined ? "boolean" : "string" } as const,
    ])
  );
  const parsed = parseArgs({
    args: argv,
    options: definitions,
    strict: false,
    tokens: true,
    allowPositionals: true,
  });
  const { tokens } = parsed;
  // SAFETY: parser definitions include every declared option. Flags parse to
  // true, and validateTokens rejects flags with a value.
  const values = Object.fromEntries(
    Object.entries(parsed.values).map(([key, value]) => [
      key,
      value === true ? "true" : value,
    ])
  ) as Record<string, string | undefined>;
  validateTokens({
    noun,
    commandName,
    spec,
    definitions,
    tokens,
    positionals: parsed.positionals,
    values,
  });
  validateValues({
    noun,
    commandName,
    spec,
    definitions,
    tokens,
    positionals: parsed.positionals,
    values,
  });
  reportMemory("before");
  try {
    await spec.run(values);
  } finally {
    reportMemory("after");
  }
};

const main = async () => {
  const [noun = "", verb, ...argv] = process.argv.slice(2);
  const nounSpec = NOUNS.get(noun);
  if (!nounSpec) {
    throw usage(
      "",
      "",
      "unknown_cli",
      `Unknown CLI "${noun}"`,
      "The first argument must be app, builds, devices, or e2e.",
      "Run `bun app --help`, `bun builds --help`, `bun devices --help`, or `bun e2e --help`."
    );
  }
  if (!verb || ["--help", "-h", "help"].includes(verb)) {
    console.log(nounHelp(noun, nounSpec));
    return;
  }
  const commandName = ALIASES.get(verb) ?? verb;
  const spec = nounSpec.commands[commandName];
  if (!spec) {
    throw usage(
      noun,
      verb,
      "unknown_command",
      `Unknown command "${verb}"`,
      `bun ${noun} has no command "${verb}".`,
      `Run \`bun ${noun} --help\` to see all commands.`
    );
  }
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(helpText(noun, commandName, spec));
    return;
  }
  await runCommand({ noun, commandName, spec, argv });
};
try {
  await main();
} catch (error) {
  const fields =
    error instanceof CliError
      ? error
      : new CliError({
          status: "unexpected_error",
          message: error instanceof Error ? error.message : String(error),
          why: "Command failed unexpectedly.",
          fix: "Rerun the command and inspect the error.",
        });
  console.error(
    `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
  );
  process.exitCode = fields.exitCode;
}
