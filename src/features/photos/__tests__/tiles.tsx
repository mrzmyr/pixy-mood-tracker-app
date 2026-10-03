import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { AttachedTile } from "../components/AttachedTile";
import { SuggestionTile } from "../components/SuggestionTile";

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

const renderAttached = ({ isImporting = false }: { isImporting?: boolean }) => {
  const onOpen = jest.fn();
  const onRemove = jest.fn();
  const view = render(
    <Theme>
      <AttachedTile
        uri="file:///photos/photo-1.jpg"
        recyclingKey="photo-1"
        index={1}
        count={3}
        size={100}
        isImporting={isImporting}
        onOpen={onOpen}
        onRemove={onRemove}
      />
    </Theme>
  );
  return { view, onOpen, onRemove };
};

describe("AttachedTile", () => {
  test("tap on the photo opens it and keeps it", async () => {
    const { view, onOpen, onRemove } = renderAttached({});
    await view;

    await fireEvent.press(screen.getByLabelText("Photo 2 of 3"));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();
  });

  test("remove button removes the photo without opening it", async () => {
    const { view, onOpen, onRemove } = renderAttached({});
    await view;

    await fireEvent.press(screen.getByLabelText("Remove Photo 2"));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("gives the remove button a 44 pt hit area", async () => {
    const { view } = renderAttached({});
    await view;

    expect(screen.getByTestId("photo-tile-2-remove")).toHaveStyle({
      width: 44,
      height: 44,
    });
  });

  test("importing: busy, remove still works", async () => {
    const { view, onRemove } = renderAttached({ isImporting: true });
    await view;

    expect(
      screen.getByLabelText("Photo 2 of 3").props.accessibilityState
    ).toMatchObject({ busy: true });
    await fireEvent.press(screen.getByLabelText("Remove Photo 2"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("SuggestionTile", () => {
  test.each([false, true])(
    "tap adds the photo, also when dimmed (%s) at the limit",
    async (isDimmed) => {
      const onAdd = jest.fn();
      await render(
        <Theme>
          <SuggestionTile
            uri="ph://library-1"
            recyclingKey="library-1"
            index={0}
            count={4}
            size={100}
            isDimmed={isDimmed}
            onAdd={onAdd}
          />
        </Theme>
      );

      await fireEvent.press(screen.getByLabelText("Photo 1 of 4"));

      expect(onAdd).toHaveBeenCalledTimes(1);
    }
  );
});
