import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import { Chip } from "@/components/chip";

const LABEL = "Überwältigt und erschöpft";

const renderChip = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Chip fill expandable label={LABEL} onPress={() => {}} />
    </ThemeProvider>
  );

const layout = (width: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height: 22 } },
});

/** Visible label first, hidden natural-width copy second. */
const reportWidths = async (visible: number, natural: number) => {
  const [visibleText, naturalText] = screen.getAllByText(LABEL, {
    includeHiddenElements: true,
  });
  await fireEvent(visibleText, "layout", layout(visible));
  await fireEvent(naturalText, "layout", layout(natural));
};

describe("Chip with expandable label", () => {
  test("label that fits shows no More", async () => {
    await renderChip();
    await reportWidths(120, 120);

    expect(screen.queryByText("More")).toBeNull();
  });

  test("cut-off label shows More and expands to the full label", async () => {
    await renderChip();
    await reportWidths(100, 180);

    await fireEvent.press(screen.getByText("More"));

    expect(screen.queryByText("More")).toBeNull();
    expect(
      screen.getAllByText(LABEL, { includeHiddenElements: true })
    ).toHaveLength(1);
    expect(screen.getByText(LABEL)).not.toHaveProp("numberOfLines", 1);
  });
});
