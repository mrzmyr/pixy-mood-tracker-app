import { DarkTheme, ThemeProvider } from "expo-router";
import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";
import Colors from "@/constants/colors";
import { Copy, Heading, Label } from "../typography";

const renderDark = (element: React.ReactElement) =>
  render(
    <ThemeProvider
      value={{
        ...DarkTheme,
        colors: { ...DarkTheme.colors, ...Colors.dark },
      }}
    >
      {element}
    </ThemeProvider>
  );

const colorOf = (text: string) =>
  StyleSheet.flatten(screen.getByText(text).props.style).color;

describe("typography", () => {
  test("text without a color stays readable in dark mode", async () => {
    await renderDark(
      <>
        <Heading size={20}>Heading</Heading>
        <Label size={16}>Label</Label>
        <Copy size={14}>Copy</Copy>
      </>
    );

    for (const text of ["Heading", "Label", "Copy"]) {
      expect(colorOf(text)).toBe(Colors.dark.text);
    }
  });

  test("a style color still wins", async () => {
    await renderDark(
      <Label size={16} style={{ color: Colors.dark.textSecondary }}>
        Muted
      </Label>
    );

    expect(colorOf("Muted")).toBe(Colors.dark.textSecondary);
  });
});
