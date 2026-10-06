import React from "react";
import { Platform } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { ThemeProvider, DefaultTheme } from "expo-router";

import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import Colors from "@/constants/Colors";

const renderList = async () =>
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <MenuList>
        <MenuListItem title="Data" isLink onPress={jest.fn()} />
        <MenuListItem title="Reminder" isLink onPress={jest.fn()} />
      </MenuList>
    </ThemeProvider>
  );

const withPlatform = async (
  os: "android" | "ios",
  run: () => Promise<void>
) => {
  const original = Platform.OS;
  Platform.OS = os;
  try {
    await run();
  } finally {
    Platform.OS = original;
  }
};

describe("MenuList", () => {
  it("renders a flat list on Android", async () => {
    await withPlatform("android", async () => {
      await renderList();
      expect(screen.getByTestId("menu-list-flat")).toBeTruthy();
      expect(screen.getByText("Data")).toBeTruthy();
    });
  });

  it("keeps the grouped list on iOS", async () => {
    await withPlatform("ios", async () => {
      await renderList();
      expect(screen.queryByTestId("menu-list-flat")).toBeNull();
      expect(screen.getByText("Data")).toBeTruthy();
    });
  });
});
