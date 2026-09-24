import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";
import z from "zod";

const ROOT = join(__dirname, "..");

// Things a scenario can be blocked on before its flow can be written or run.
const NEEDS = {
  "calendar-entry-label": "Calendar cells say whether a day has an entry (accessibility label)",
  "manual-file-picker": "Import goes through the system file picker, which is run by hand",
  "store-build-artifact": "The current store build as an APK or iOS simulator build",
  "e2e-seed-hook": "E2E-only action that loads a large history without the file picker",
  "e2e-fault-hook": "E2E-only action that corrupts stored logs or makes writes fail",
} as const;

const ScenarioSchema = z.strictObject({
  id: z.string().regex(/^DI-\d{2}$/),
  title: z.string().min(1),
  catches: z.string().min(1),
  refs: z.array(z.string().regex(/^#\d+$/)),
  status: z.enum(["planned", "implemented"]),
  flow: z.string().regex(/^e2e\/flows\/data-integrity\/[a-z0-9-]+\.yaml$/),
  runsOn: z.array(z.enum(["android-emulator", "ios-simulator", "physical-device"])).min(1),
  changesData: z.boolean(),
  needs: z.array(z.enum(Object.keys(NEEDS) as [keyof typeof NEEDS])),
  steps: z.array(z.string().min(1)).min(1),
  passWhen: z.array(z.string().min(1)).min(1),
});

const CatalogSchema = z.strictObject({
  rules: z.array(z.string().min(1)).min(1),
  scenarios: z.array(ScenarioSchema).min(1),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

// Returns every problem found, so one run shows all of them.
export const checkCatalog = (raw: unknown): string[] => {
  const result = CatalogSchema.safeParse(raw);
  if (!result.success) {
    return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  }

  const problems: string[] = [];
  const seen = new Set<string>();

  for (const scenario of result.data.scenarios) {
    const { id } = scenario;
    if (seen.has(id)) problems.push(`${id}: duplicate id`);
    seen.add(id);

    const flowExists = existsSync(join(ROOT, scenario.flow));
    if (scenario.status === "implemented" && !flowExists) {
      problems.push(`${id}: status is implemented but ${scenario.flow} does not exist`);
    }
    if (scenario.status === "planned" && flowExists) {
      problems.push(`${id}: ${scenario.flow} exists, set status to implemented`);
    }

    if (scenario.changesData && scenario.runsOn.includes("physical-device")) {
      problems.push(`${id}: changes data, so it must not run on a physical device with real entries`);
    }
  }

  return problems;
};

export const loadCatalog = () =>
  parse(readFileSync(join(ROOT, "e2e/scenarios.yaml"), "utf8"));

// `bun run e2e:scenarios` prints an overview and fails on an invalid catalog.
if (require.main === module) {
  const raw = loadCatalog();
  const problems = checkCatalog(raw);
  if (problems.length > 0) {
    console.error(`Invalid e2e/scenarios.yaml:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }

  const { scenarios } = CatalogSchema.parse(raw);
  console.table(scenarios.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
    runsOn: s.runsOn.join(", "),
    needs: s.needs.join(", ") || "-",
  })));

  const blockers = new Set(scenarios.filter((s) => s.status === "planned").flatMap((s) => s.needs));
  if (blockers.size > 0) {
    console.log("\nOpen needs:");
    for (const need of blockers) console.log(`  ${need}: ${NEEDS[need]}`);
  }
}
