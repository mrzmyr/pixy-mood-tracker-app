import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";

import Colors from "@/constants/Colors";

import MenuListHeadline from "../MenuListHeadline";

const renderHeadline = async (os: "ios" | "android") => {
  jest.replaceProperty(Platform, "OS", os);
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <MenuListHeadline>About</MenuListHeadline>
    </ThemeProvider>
  );
  return StyleSheet.flatten(screen.getByText("About").props.style);
};

describe("MenuListHeadline", () => {
  it("keeps casing and uses secondary color at 13pt on iOS", async () => {
    const style = await renderHeadline("ios");
    expect(style.fontSize).toBe(13);
    expect(style.textTransform).toBeUndefined();
    expect(style.color).toBe(Colors.light.textSecondary);
  });

  it("uses medium 14sp tint subheader without uppercase on Android", async () => {
    const style = await renderHeadline("android");
    expect(style.fontSize).toBe(14);
    expect(style.fontWeight).toBe("500");
    expect(style.textTransform).toBeUndefined();
    expect(style.color).toBe(Colors.light.tint);
    expect(style.paddingLeft).toBe(16);
  });

  it("lets callers override style", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    await render(
      <ThemeProvider
        value={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <MenuListHeadline style={{ marginTop: 0 }}>About</MenuListHeadline>
      </ThemeProvider>
    );
    expect(
      StyleSheet.flatten(screen.getByText("About").props.style).marginTop
    ).toBe(0);
  });
});
