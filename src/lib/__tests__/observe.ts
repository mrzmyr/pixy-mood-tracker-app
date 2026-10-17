import { observeConfig } from "@/lib/observe";

const phone = {
  hasVariant: true,
  variant: "production",
  isDevice: true,
} as const;

const configKeys = (consent: boolean) =>
  Object.keys(observeConfig({ consent }, phone)).sort();

describe("observeConfig", () => {
  it("keeps dispatch off until consent", () => {
    expect(observeConfig({ consent: false }, phone).dispatchingEnabled).toBe(
      false
    );
    expect(observeConfig({ consent: true }, phone).dispatchingEnabled).toBe(
      true
    );
  });

  it("sets the same fields with and without consent", () => {
    expect(configKeys(true)).toEqual(configKeys(false));
  });

  it("dispatches from preview builds on real devices", () => {
    const build = { ...phone, variant: "preview" } as const;

    expect(observeConfig({ consent: true }, build).dispatchingEnabled).toBe(
      true
    );
  });

  it.each([
    ["simulator or emulator", { ...phone, isDevice: false }],
    ["development build", { ...phone, variant: "development" }],
    ["build without variant", { ...phone, hasVariant: false }],
  ] as const)("never dispatches from a %s", (_, build) => {
    expect(observeConfig({ consent: true }, build).dispatchingEnabled).toBe(
      false
    );
  });
});
