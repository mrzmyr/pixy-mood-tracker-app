import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import { Chip } from "@/components/chip";
import { HostWidthContext } from "@/components/host-width-context";

const LABEL = "Überwältigt und erschöpft";

const renderChip = ({ hostWidth }: { hostWidth?: number } = {}) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <HostWidthContext value={hostWidth}>
        <Chip fill expandable label={LABEL} onPress={() => {}} />
      </HostWidthContext>
    </ThemeProvider>
  );

const layout = (width: number, x = 0) => ({
  nativeEvent: { layout: { x, y: 0, width, height: 22 } },
});

/** Visible label first, hidden natural-width copy second. */
const reportWidths = async (visible: number, natural: number, x = 0) => {
  const [visibleText, naturalText] = screen.getAllByText(LABEL, {
    includeHiddenElements: true,
  });
  await fireEvent(visibleText, "layout", layout(visible, x));
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

  test("inside a SwiftUI host, cut-off label gets room left of More", async () => {
    // Host layout keeps the label at natural width, so only the cell
    // width tells it is cut off. Cell 160, label starts at 40, end
    // padding 16: room 104.
    await renderChip({ hostWidth: 160 });
    await reportWidths(180, 180, 40);
    await fireEvent(screen.getByText("More"), "layout", layout(30));

    // Room 104 minus More 30 and gap 8.
    expect(screen.getByText(LABEL)).toHaveStyle({ maxWidth: 66 });
  });
});
