import { DefaultTheme, ThemeProvider } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import Colors from "@/constants/Colors";

import { Display, Secondary, Section, Title } from "../Type";
import { getTypeMetrics } from "../typeMetrics";

type OS = "ios" | "android";

const setOS = (os: OS) => {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
};

const originalOS: OS = Platform.OS === "android" ? "android" : "ios";

afterEach(() => setOS(originalOS));

const renderRole = (element: React.ReactElement) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      {element}
    </ThemeProvider>
  );

describe("type roles", () => {
  test("every role keeps a line height above its font size on both platforms", () => {
    for (const os of ["ios", "android"] as const) {
      setOS(os);
      for (const [name, metrics] of Object.entries(getTypeMetrics())) {
        expect({
          name,
          os,
          ok: (metrics.lineHeight ?? 0) > (metrics.fontSize ?? 0),
        }).toEqual({ name, os, ok: true });
      }
    }
  });

  test("Android sizes differ from iOS for roles that follow Material", () => {
    setOS("ios");
    const ios = getTypeMetrics();
    setOS("android");
    const android = getTypeMetrics();

    expect(android.body.fontSize).not.toBe(ios.body.fontSize);
    expect(android.display.fontSize).toBeGreaterThan(ios.display.fontSize ?? 0);
  });

  test("components render the metrics of the current platform", async () => {
    setOS("android");
    const { getByText } = await renderRole(<Secondary>Hint</Secondary>);
    const style = StyleSheet.flatten(getByText("Hint").props.style);

    expect(style.fontSize).toBe(getTypeMetrics().secondary.fontSize);
    expect(style.lineHeight).toBe(getTypeMetrics().secondary.lineHeight);
  });

  test("style prop overrides the role", async () => {
    const { getByText } = await renderRole(
      <Section style={{ fontSize: 40 }}>Heading</Section>
    );

    expect(StyleSheet.flatten(getByText("Heading").props.style).fontSize).toBe(
      40
    );
  });

  test("Title and Display stay distinct", async () => {
    const { getByText } = await renderRole(
      <>
        <Title>T</Title>
        <Display>D</Display>
      </>
    );
    const title = StyleSheet.flatten(getByText("T").props.style);
    const display = StyleSheet.flatten(getByText("D").props.style);

    expect(display.fontSize).toBeGreaterThan(title.fontSize ?? 0);
  });
});
