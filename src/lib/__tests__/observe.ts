import { observeConfig } from "@/lib/observe";

const configKeys = (consent: boolean) =>
  Object.keys(observeConfig({ consent })).sort();

describe("observeConfig", () => {
  it("keeps dispatch off until consent", () => {
    expect(observeConfig({ consent: false }).dispatchingEnabled).toBe(false);
    expect(observeConfig({ consent: true }).dispatchingEnabled).toBe(true);
  });

  it("sets the same fields with and without consent", () => {
    expect(configKeys(true)).toEqual(configKeys(false));
  });
});
