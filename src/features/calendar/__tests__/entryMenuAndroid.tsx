import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { EntryMenu } from "../screens/LogList/EntryMenu.android";

// Compose views come from the manual mock in
// src/__mocks__/@expo/ui/jetpack-compose.js. It throws when a Compose view
// sits outside a `Host`, like the phone does.

const renderMenu = async () => {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <EntryMenu
        label="More"
        testID="log-list-menu"
        editLabel="Edit"
        deleteLabel="Delete"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </ThemeProvider>
  );
  return { onEdit, onDelete };
};

describe("Android entry menu", () => {
  test("hides Edit and Delete until the trigger is pressed", async () => {
    await renderMenu();

    expect(screen.queryByText("Edit")).toBeNull();
    await fireEvent.press(screen.getByTestId("log-list-menu"));

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  test.each([
    ["Edit", "onEdit"],
    ["Delete", "onDelete"],
  ] as const)("%s calls %s and closes the menu", async (label, handler) => {
    const handlers = await renderMenu();

    await fireEvent.press(screen.getByTestId("log-list-menu"));
    await fireEvent.press(screen.getByText(label));

    expect(handlers[handler]).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(label)).toBeNull();
  });
});
