import {
  getReportHeaderOptions,
  isBannerCovered,
} from "@/features/statistics/components/useReportHeader";

const options = (covered: boolean) =>
  getReportHeaderOptions({
    covered,
    title: "May 2026",
    headerColor: "#123456",
    tintColor: "#ffffff",
  });

describe("report header", () => {
  it("is covered once the banner scrolls under the header", () => {
    expect(isBannerCovered(0, 200, 100)).toBe(false);
    expect(isBannerCovered(99, 200, 100)).toBe(false);
    expect(isBannerCovered(100, 200, 100)).toBe(true);
    expect(isBannerCovered(500, 200, 100)).toBe(true);
  });

  it("is transparent and untitled while the banner shows", () => {
    expect(options(false)).toMatchObject({
      headerTransparent: true,
      headerTitle: "",
      headerStyle: { backgroundColor: "transparent" },
    });
  });

  it("turns solid with the title once covered", () => {
    expect(options(true)).toMatchObject({
      headerTransparent: false,
      headerTitle: "May 2026",
      headerStyle: { backgroundColor: "#123456" },
    });
  });

  it("keeps the back button tint on both states", () => {
    expect(options(false).headerTintColor).toBe("#ffffff");
    expect(options(true).headerTintColor).toBe("#ffffff");
  });
});
