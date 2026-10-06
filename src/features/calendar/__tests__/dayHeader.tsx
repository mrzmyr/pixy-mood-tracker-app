import { DefaultTheme, ThemeProvider } from "expo-router";
import { render } from "@testing-library/react-native";
import { Platform } from "react-native";
import { Header } from "../screens/LogList/Header";

const TITLE = "Mon, 5 Oct";

const closeComesFirst = async (os: "android" | "ios") => {
  jest.replaceProperty(Platform, "OS", os);
  const { toJSON } = await render(
    <ThemeProvider value={DefaultTheme}>
      <Header title={TITLE} onClose={jest.fn()} />
    </ThemeProvider>
  );
  const tree = JSON.stringify(toJSON());
  return tree.indexOf("log-list-close") < tree.indexOf(TITLE);
};

describe("day view header", () => {
  afterEach(() => jest.restoreAllMocks());

  it("puts close before the title on Android", async () => {
    expect(await closeComesFirst("android")).toBe(true);
  });

  it("keeps close after the title on iOS", async () => {
    expect(await closeComesFirst("ios")).toBe(false);
  });
});
