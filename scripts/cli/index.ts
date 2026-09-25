// Entry point for the local device, session, and build CLIs:
//   bun devices <command>    simulators, emulators, phones
//   bun sessions <command>   e2e runs on those devices
//   bun builds <command>     the shared native build cache
// Run `bun <noun> help` for options.
import { BUILDS_COMMANDS } from "./builds.ts";
import { DEVICES_COMMANDS } from "./devices.ts";
import { SESSIONS_COMMANDS } from "./sessions.ts";
import { CliError, parseCli } from "./shared.ts";

const NOUNS = new Map([
  ["builds", BUILDS_COMMANDS],
  ["devices", DEVICES_COMMANDS],
  ["sessions", SESSIONS_COMMANDS],
]);
const ALIASES = new Map([
  ["ls", "list"],
  ["ps", "list"],
]);

const main = async () => {
  const { positionals, values } = parseCli();
  const [noun = "", verb = "list", ...args] = positionals;
  const commands = NOUNS.get(noun);
  if (!commands) {
    throw new CliError({
      fix: "Run `bun devices`, `bun sessions`, or `bun builds`.",
      message: `Unknown CLI "${noun}"`,
      status: "unknown_cli",
      why: "The first argument must be devices, sessions, or builds.",
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
          fix: "Rerun the command. If it fails again, check the device with `bun devices list --all`.",
          message: error instanceof Error ? error.message : String(error),
          status: "unexpected_error",
          why: "An underlying tool (xcrun, adb, emulator, maestro-runner) failed.",
        };
  console.error(
    `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
  );
  process.exitCode = 1;
}
