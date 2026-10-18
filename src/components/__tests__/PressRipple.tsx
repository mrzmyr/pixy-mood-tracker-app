import { DefaultTheme, ThemeProvider } from "expo-router";
import { render } from "@testing-library/react-native";
import { Platform, processColor } from "react-native";

import Colors from "@/constants/Colors";

import LinkButton from "@/components/LinkButton";
import MenuListItem from "@/components/MenuListItem";

const renderLight = async (ui: React.ReactElement) =>
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      {ui}
    </ThemeProvider>
  );

// App code reads `process.env.EXPO_OS`; Pressable itself reads `Platform.OS`
// to pass the ripple to the native view.
const setPlatform = (os: typeof process.env.EXPO_OS) => {
  process.env.EXPO_OS = os;
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
};

describe("press ripple", () => {
  const original = process.env.EXPO_OS;
  afterEach(() => setPlatform(original));

  test("Android rows ripple with the theme token", async () => {
    setPlatform("android");
    const { getByTestId } = await renderLight(
      <MenuListItem testID="row" title="Data" onPress={() => {}} />
    );
    expect(getByTestId("row").props.nativeForegroundAndroid).toMatchObject({
      color: processColor(Colors.light.pressRipple),
    });
  });

  test("Android icon-only link button ripples borderless", async () => {
    setPlatform("android");
    const { getByTestId } = await renderLight(
      <LinkButton testID="icon" onPress={() => {}} />
    );
    expect(getByTestId("icon").props.nativeBackgroundAndroid).toMatchObject({
      borderless: true,
    });
  });

  test("iOS has no ripple", async () => {
    setPlatform("ios");
    const { getByTestId } = await renderLight(
      <MenuListItem testID="row" title="Data" onPress={() => {}} />
    );
    expect(getByTestId("row").props.nativeForegroundAndroid).toBeUndefined();
  });

  test("rows without onPress have no ripple", async () => {
    setPlatform("android");
    const { getByTestId } = await renderLight(
      <MenuListItem testID="row" title="Info" />
    );
    expect(getByTestId("row").props.nativeForegroundAndroid).toBeUndefined();
  });
});
