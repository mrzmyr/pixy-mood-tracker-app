import {
  argbFromHex,
  Hct,
  hexFromArgb,
  MaterialDynamicColors,
  SchemeTonalSpot,
} from "@material/material-color-utilities";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";
import { FIELD_COLORS, GROUPED_COLORS } from "@/constants/colors/grouped";

// Compose builds the Android palette from the seed at runtime. The fixed hex
// values must match it, or React Native lists drift from native lists.
const materialSurfaces = (isDark: boolean) => {
  const scheme = new SchemeTonalSpot(
    Hct.fromInt(argbFromHex(MATERIAL_SEED_COLOR)),
    isDark,
    0
  );
  const hex = (color: typeof MaterialDynamicColors.surface) =>
    hexFromArgb(color.getArgb(scheme));
  return {
    page: hex(MaterialDynamicColors.surface),
    row: hex(MaterialDynamicColors.surfaceContainer),
    field: {
      background: hex(MaterialDynamicColors.surfaceContainerHighest),
      text: hex(MaterialDynamicColors.onSurface),
      placeholder: hex(MaterialDynamicColors.onSurfaceVariant),
    },
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

describe("FIELD_COLORS.android", () => {
  it.each([
    ["light", false],
    ["dark", true],
  ] as const)("matches the seeded Material %s palette", (mode, isDark) => {
    const { field } = materialSurfaces(isDark);
    const actual = FIELD_COLORS.android[mode];
    expect(actual.background.toLowerCase()).toBe(field.background);
    expect(actual.text.toLowerCase()).toBe(field.text);
    expect(actual.placeholder.toLowerCase()).toBe(field.placeholder);
  });
});
