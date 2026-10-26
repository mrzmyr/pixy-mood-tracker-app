import { canReportTelemetry } from "@/lib/telemetry";

const phone = {
  hasVariant: true,
  variant: "production",
  isDevice: true,
} as const;

describe("canReportTelemetry", () => {
  it("reports from production and preview builds on real devices", () => {
    expect(canReportTelemetry(phone)).toBe(true);
    expect(canReportTelemetry({ ...phone, variant: "preview" })).toBe(true);
  });

  it.each([
    ["simulator or emulator", { ...phone, isDevice: false }],
    ["development build", { ...phone, variant: "development" }],
    ["build without variant", { ...phone, hasVariant: false }],
  ] as const)("never reports from a %s", (_, build) => {
    expect(canReportTelemetry(build)).toBe(false);
  });
});
