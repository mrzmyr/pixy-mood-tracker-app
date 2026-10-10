import { DefaultTheme, ThemeProvider } from "expo-router";
import { useState } from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Colors from "@/constants/Colors";
import { ColorPicker } from "../components/ColorPicker";

const Form = () => {
  const [color, setColor] = useState("slate");
  return <ColorPicker value={color} onChange={setColor} />;
};

describe("Tag color selection", () => {
  test.each(["light", "dark"] as const)(
    "moves checked state to the tapped color in %s mode",
    async (scheme) => {
      const result = await render(
        <ThemeProvider
          value={{
            ...DefaultTheme,
            colors: { ...DefaultTheme.colors, ...Colors[scheme] },
          }}
        >
          <Form />
        </ThemeProvider>
      );

      expect(result.getByTestId("tag-color-slate")).toBeChecked();
      await fireEvent.press(result.getByTestId("tag-color-yellow"));
      expect(result.getByTestId("tag-color-yellow")).toBeChecked();
      expect(result.getByTestId("tag-color-slate")).not.toBeChecked();
      expect(result.getAllByRole("radio", { checked: true })).toHaveLength(1);
    }
  );

  test("tapping the current color does not trigger another change", async () => {
    const onChange = jest.fn();
    const result = await render(
      <ThemeProvider
        value={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <ColorPicker value="slate" onChange={onChange} />
      </ThemeProvider>
    );
    await fireEvent.press(result.getByTestId("tag-color-slate"));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(result.getByTestId("tag-color-red"));
    expect(onChange).toHaveBeenCalledWith("red");
  });
});
