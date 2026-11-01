import {
  argbFromHex,
  Hct,
  hexFromArgb,
  MaterialDynamicColors,
  SchemeTonalSpot,
} from "@material/material-color-utilities";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";
import { GROUPED_COLORS } from "@/constants/colors/grouped";

// Compose builds the Android palette from the seed at runtime. The fixed hex
// values must match it, or React Native lists drift from native lists.
const materialSurfaces = (isDark: boolean) => {
  const scheme = new SchemeTonalSpot(
    Hct.fromInt(argbFromHex(MATERIAL_SEED_COLOR)),
    isDark,
    0
  );
  return {
    page: hexFromArgb(MaterialDynamicColors.surface.getArgb(scheme)),
    row: hexFromArgb(MaterialDynamicColors.surfaceContainer.getArgb(scheme)),
  };
};

describe("GROUPED_COLORS.android", () => {
  it.each([
    ["light", false],
    ["dark", true],
  ] as const)("matches the seeded Material %s palette", (mode, isDark) => {
    const expected = materialSurfaces(isDark);
    const actual = GROUPED_COLORS.android[mode];
    expect(actual.page.toLowerCase()).toBe(expected.page);
    expect(actual.row.toLowerCase()).toBe(expected.row);
  });
});
