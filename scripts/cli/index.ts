// Entry point for the local CLIs:
//   bun app <command>       check a device, build, install, and run the app
//   bun builds <command>    the shared native build cache
//   bun devices <command>   devices with the IDs and names --device accepts
//   bun e2e <command>       e2e runs through agent-device
// Run `bun <noun> --help` or `bun <noun> <command> --help` for options.
import { parseArgs } from "node:util";

import { APP } from "./app.ts";
import { BUILDS } from "./builds.ts";
import { DEVICES } from "./devices.ts";
import { E2E } from "./e2e.ts";
import { CliError } from "./shared.ts";
import type { CommandSpec, Noun } from "./shared.ts";

const NOUNS = new Map<string, Noun>([
  ["app", APP],
  ["builds", BUILDS],
  ["devices", DEVICES],
  ["e2e", E2E],
]);
const ALIASES = new Map([
  ["ls", "list"],
  ["remove", "rm"],
]);
const HELP_FLAGS = new Set(["-h", "--help", "help"]);

const usageError = (
  fields: Omit<ConstructorParameters<typeof CliError>[0], "exitCode">
) => new CliError({ ...fields, exitCode: 2 });

const formatUsage = (noun: string, verb: string, spec: CommandSpec) =>
  spec.usage
    ? `bun ${noun} ${verb} ${spec.usage}`
    : [
        `bun ${noun} ${verb}`,
        ...(spec.args ?? []),
        ...(spec.options ? ["[options]"] : []),
        ...(spec.hasPassthrough ? ["[-- <args>]"] : []),
      ].join(" ");

const printNounHelp = (noun: string, { commands, footer, summary }: Noun) => {
  const width = Math.max(...Object.keys(commands).map((verb) => verb.length));
  const lines = Object.entries(commands).map(
    ([verb, spec]) => `  ${verb.padEnd(width)}  ${spec.summary}`
  );
  const aliases = [...ALIASES]
    .filter(([, verb]) => verb in commands)
    .map(([alias, verb]) => `${alias} = ${verb}`)
    .join(", ");
  console.log(`${summary}

Usage: bun ${noun} <command> [options]

Commands:
${lines.join("\n")}
${footer ? `\n${footer}\n` : ""}
Run \`bun ${noun} <command> --help\` for options.${aliases ? ` Aliases: ${aliases}.` : ""}`);
};

const printCommandHelp = (noun: string, verb: string, spec: CommandSpec) => {
  console.log(`${spec.summary}\n\nUsage: ${formatUsage(noun, verb, spec)}`);
  if (spec.details) {
    console.log(`\n${spec.details}`);
  }
};

// Required `<x>` and optional `[x]` positionals; `...` accepts any number.
const checkArgs = (
  noun: string,
  verb: string,
  spec: CommandSpec,
  args: string[]
) => {
  const declared = spec.args ?? [];
  const required = declared.filter((arg) => arg.startsWith("<"));
  const isVariadic = declared.some((arg) => arg.includes("..."));
  const usage = formatUsage(noun, verb, spec);
  if (args.length < required.length) {
    throw usageError({
      fix: spec.argsSource
        ? `Find one with \`${spec.argsSource}\`, then run: ${usage}.`
        : `Run: ${usage}.`,
      message: `Missing ${required[args.length]}`,
      status: "missing_argument",
      why: `Usage: ${usage}.`,
    });
  }
  if (!isVariadic && args.length > declared.length) {
    throw usageError({
      fix: `Run: ${usage}.`,
      message: `Unexpected argument "${args[declared.length]}"`,
      status: "unexpected_argument",
      why: `bun ${noun} ${verb} takes ${declared.length === 0 ? "no arguments" : declared.join(" ")}.`,
    });
  }
};

const parseFlags = (
  noun: string,
  verb: string,
  spec: CommandSpec,
  argv: string[]
) => {
  try {
    return parseArgs({
      allowPositionals: true,
      args: argv,
      options: { ...spec.options, help: { short: "h", type: "boolean" } },
    });
  } catch (error) {
    throw usageError({
      fix: `Run \`bun ${noun} ${verb} --help\` to see its options.`,
      message: error instanceof Error ? error.message : String(error),
      status: "invalid_option",
      why: `bun ${noun} ${verb} does not accept this option or value.`,
    });
  }
};

// `-- <args>` goes unparsed to commands that forward it to another tool.
const splitPassthrough = (spec: CommandSpec, argv: string[]) => {
  const index = argv.indexOf("--");
  return spec.hasPassthrough && index !== -1
    ? { own: argv.slice(0, index), passthrough: argv.slice(index + 1) }
    : { own: argv, passthrough: [] };
};

const main = async () => {
  const [noun = "", verb, ...argv] = process.argv.slice(2);
  const nounSpec = NOUNS.get(noun);
  if (!nounSpec) {
    throw usageError({
      fix: "Run `bun app --help`, `bun builds --help`, `bun devices --help`, or `bun e2e --help`.",
      message: `Unknown CLI "${noun}"`,
      status: "unknown_cli",
      why: "The first argument must be app, builds, devices, or e2e.",
    });
  }
  if (verb === undefined || HELP_FLAGS.has(verb)) {
    printNounHelp(noun, nounSpec);
    return;
  }
  const name = ALIASES.get(verb) ?? verb;
  const spec = nounSpec.commands[name];
  if (!spec) {
    throw usageError({
      fix: `Run \`bun ${noun} --help\` to see all commands.`,
      message: `Unknown command "${verb}"`,
      status: "unknown_command",
      why: `bun ${noun} has no command "${verb}".`,
    });
  }
  const { own, passthrough } = splitPassthrough(spec, argv);
  const { positionals, values } = parseFlags(noun, name, spec, own);
  if (values.help) {
    printCommandHelp(noun, name, spec);
    return;
  }
  checkArgs(noun, name, spec, positionals);
  await spec.run(positionals, values, passthrough);
};

try {
  await main();
} catch (error) {
  const fields =
    error instanceof CliError
      ? error
      : {
          exitCode: 1,
          fix: "Rerun the command. If it fails again, run it with --help to check its usage.",
          message: error instanceof Error ? error.message : String(error),
          status: "unexpected_error",
          why: "Reading the build cache, e2e runs, or the native fingerprint failed.",
        };
  console.error(
    `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
  );
  process.exitCode = fields.exitCode;
}
