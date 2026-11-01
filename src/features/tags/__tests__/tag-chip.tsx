import { useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import Tag from "../components/tag";

const withTheme = (ui: React.ReactElement) => (
  <ThemeProvider
    value={{
      ...DefaultTheme,
      dark: false,
      colors: { ...DefaultTheme.colors, ...Colors.light },
    }}
  >
    {ui}
  </ThemeProvider>
);

const ToggleTag = () => {
  const [selected, setSelected] = useState(false);
  return (
    <Tag
      title="Work"
      colorName="slate"
      selected={selected}
      onPress={() => setSelected((value) => !value)}
    />
  );
};

describe("Tag chip accessibility", () => {
  test("toggling the chip flips its checked state", async () => {
    const result = await render(withTheme(<ToggleTag />));

    expect(result.getByRole("checkbox", { name: "Work" })).not.toBeChecked();
    await fireEvent.press(result.getByRole("checkbox", { name: "Work" }));
    expect(result.getByRole("checkbox", { name: "Work" })).toBeChecked();
  });

  test("read-only chip is not exposed as a checkbox", async () => {
    const result = await render(
      withTheme(<Tag title="Work" colorName="slate" selected compact />)
    );

    expect(result.queryByRole("checkbox")).toBeNull();
  });
});
