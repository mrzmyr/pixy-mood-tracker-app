// Entry point for the local build cache CLI:
//   bun builds <command>    the shared native build cache
// Devices and e2e runs use agent-device (`bun e2e`, `bunx agent-device`).
// Run `bun builds help` for options.
import { BUILDS_COMMANDS } from "./builds.ts";
import { CliError, parseCli } from "./shared.ts";

const NOUNS = new Map([["builds", BUILDS_COMMANDS]]);
const ALIASES = new Map([["ls", "list"]]);

const main = async () => {
  const { positionals, values } = parseCli();
  const [noun = "", verb = "list", ...args] = positionals;
  const commands = NOUNS.get(noun);
  if (!commands) {
    throw new CliError({
      fix: "Run `bun builds`. For devices and e2e runs, use `bunx agent-device` and `bun e2e`.",
      message: `Unknown CLI "${noun}"`,
      status: "unknown_cli",
      why: "The first argument must be builds.",
    });
  }
  const command = commands.get(
    values.help ? "help" : (ALIASES.get(verb) ?? verb)
  );
  if (!command) {
    throw new CliError({
      fix: `Run \`bun ${noun} help\` to see all commands.`,
      message: `Unknown command "${verb}"`,
      status: "unknown_command",
      why: `bun ${noun} has no command "${verb}".`,
    });
  }
  await command(args, values);
};

try {
  await main();
} catch (error) {
  const fields =
    error instanceof CliError
      ? error
      : {
          fix: "Rerun the command. If it fails again, run `bun builds list` to check the cache.",
          message: error instanceof Error ? error.message : String(error),
          status: "unexpected_error",
          why: "Reading the build cache or computing the native fingerprint failed.",
        };
  console.error(
    `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
  );
  process.exitCode = 1;
}
