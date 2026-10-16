import { BEZEL } from "@/constants/Bezel";
import { getCardChartWidth } from "@/features/statistics/components/cardChartWidth";

describe("getCardChartWidth", () => {
  test.each([320, 390, 430])(
    "chart fits inside screen padding, card padding, and bezel at %ipx",
    (windowWidth) => {
      const screenPadding = 2 * 20;
      const cardPadding = 2 * 16;
      const bezel = 2 * (BEZEL.gap + 2 * BEZEL.borderWidth);
      const chrome = screenPadding + cardPadding + bezel;

      expect(getCardChartWidth(windowWidth) + chrome).toBeLessThanOrEqual(
        windowWidth
      );
    }
  );
});
