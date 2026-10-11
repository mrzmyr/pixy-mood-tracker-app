import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { PickTile } from "../components/PickTile";

const Theme = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider
    value={{
      ...DefaultTheme,
      dark: false,
      colors: { ...DefaultTheme.colors, ...Colors.light },
    }}
  >
    {children}
  </ThemeProvider>
);

const renderPick = ({
  order = null,
  isDimmed = false,
  isImporting = false,
}: {
  order?: number | null;
  isDimmed?: boolean;
  isImporting?: boolean;
}) => {
  const onToggle = jest.fn();
  const onOpen = jest.fn();
  const view = render(
    <Theme>
      <PickTile
        uri="ph://library-1"
        recyclingKey="library-1"
        position={2}
        count={4}
        order={order}
        size={100}
        isDimmed={isDimmed}
        isImporting={isImporting}
        onToggle={onToggle}
        onOpen={onOpen}
      />
    </Theme>
  );
  return { view, onToggle, onOpen };
};

describe("PickTile", () => {
  test.each([null, 3])("tap toggles the photo (order %s)", async (order) => {
    const { view, onToggle, onOpen } = renderPick({ order });
    await view;

    await fireEvent.press(screen.getByLabelText("Photo 2 of 4"));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("tap toggles also when dimmed at the limit", async () => {
    const { view, onToggle } = renderPick({ isDimmed: true });
    await view;

    await fireEvent.press(screen.getByLabelText("Photo 2 of 4"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("checked: long press and the View action open the photo", async () => {
    const { view, onOpen, onToggle } = renderPick({ order: 1 });
    await view;
    const tile = screen.getByLabelText("Photo 2 of 4");

    await fireEvent(tile, "longPress");
    await fireEvent(tile, "accessibilityAction", {
      nativeEvent: { actionName: "view" },
    });

    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onToggle).not.toHaveBeenCalled();
  });

  test("unchecked: long press does not open the photo", async () => {
    const { view, onOpen } = renderPick({});
    await view;

    await fireEvent(screen.getByLabelText("Photo 2 of 4"), "longPress");

    expect(onOpen).not.toHaveBeenCalled();
  });

  test("checked state and import reach screen readers", async () => {
    const { view } = renderPick({ order: 1, isImporting: true });
    await view;

    expect(
      screen.getByLabelText("Photo 2 of 4").props.accessibilityState
    ).toMatchObject({ checked: true, busy: true });
  });
});
