import { readdirSync } from "node:fs";
import path from "node:path";

import app from "../../app.json";
import facts from "../app-facts.json";

// Guards the single source of truth for app facts. See AGENTS.md "App facts".
const statuses = Object.keys(facts.featureStatuses);
const iso = /^\d{4}-\d{2}-\d{2}$/u;
const semver = /^\d+\.\d+\.\d+$/u;

describe("docs/app-facts.json", () => {
  it("has unique feature ids", () => {
    const ids = facts.features.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only declared statuses", () => {
    for (const f of facts.features) {
      expect(statuses).toContain(f.status);
    }
  });

  it("gives every feature a label, group, and description", () => {
    for (const f of facts.features) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.group.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it("maps each competitor key to one status", () => {
    // Website comparison rows read one boolean per key. Two features sharing a key must agree.
    const byKey = new Map<string, Set<string>>();
    for (const f of facts.features) {
      if (!("competitorKey" in f) || !f.competitorKey) {
        continue;
      }
      const set = byKey.get(f.competitorKey) ?? new Set();
      set.add(f.status === "available" ? "yes" : "no");
      byKey.set(f.competitorKey, set);
    }
    for (const [key, set] of byKey) {
      expect({ key, size: set.size }).toEqual({ key, size: 1 });
    }
  });

  it("has well-formed dates and versions", () => {
    expect(facts.verifiedOn).toMatch(iso);
    expect(facts.releases.source.version).toMatch(semver);
    expect(facts.releases.source.date).toMatch(iso);
    expect(facts.releases.store.version).toMatch(semver);
    expect(facts.releases.store.date).toMatch(iso);
    expect(facts.releases.store.verifiedOn).toMatch(iso);
  });

  it("matches app.json version and ids", () => {
    expect(facts.releases.source.version).toBe(app.expo.version);
    expect(facts.identity.ids.bundle).toBe(app.expo.ios.bundleIdentifier);
    expect(facts.identity.ids.package).toBe(app.expo.android.package);
  });

  it("counts the shipped locales", () => {
    const locales = readdirSync(
      path.join(__dirname, "..", "..", "assets", "locales")
    ).filter((n) => n.endsWith(".json"));
    expect(facts.languages).toBe(locales.length);
  });
});
