import { ScrollView, Text } from "react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { fireEvent, render } from "@testing-library/react-native";
import Colors from "@/constants/Colors";
import { PullToSearch } from "../components/PullToSearch";

const scrollEvent = (y: number) => ({
  nativeEvent: {
    contentOffset: { x: 0, y },
    contentSize: { width: 400, height: 1000 },
    layoutMeasurement: { width: 400, height: 600 },
  },
});

const renderSearch = async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo");
  const screen = await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <PullToSearch
        testID="search"
        placeholder="Search"
        query=""
        onChangeQuery={jest.fn()}
      >
        <Text>Work</Text>
      </PullToSearch>
    </ThemeProvider>
  );
  // Ignore the initial scroll that hides the bar.
  scrollTo.mockClear();
  return { scrollView: screen.getByTestId("search"), scrollTo };
};

afterEach(() => {
  jest.restoreAllMocks();
});

it("hides a half visible bar after the user's fling stops", async () => {
  const { scrollView, scrollTo } = await renderSearch();

  await fireEvent(scrollView, "momentumScrollBegin", scrollEvent(70));
  await fireEvent(scrollView, "momentumScrollEnd", scrollEvent(40));

  expect(scrollTo).toHaveBeenCalledTimes(1);
  expect(scrollTo).toHaveBeenCalledWith({ y: 52, animated: true });
});

// iOS reports the end of a `scrollTo` animation as a momentum end. When the
// hidden offset was out of reach, PullToSearch hid the bar again on every such
// end. The loop never stopped, and the scroll view swallowed every tap on the
// tags until the logger closed.
it("does not hide again when its own scroll ends short of the hidden offset", async () => {
  const { scrollView, scrollTo } = await renderSearch();

  await fireEvent(scrollView, "momentumScrollBegin", scrollEvent(70));
  await fireEvent(scrollView, "momentumScrollEnd", scrollEvent(40));
  await fireEvent(scrollView, "momentumScrollEnd", scrollEvent(50.67));
  await fireEvent(scrollView, "momentumScrollEnd", scrollEvent(50.67));

  expect(scrollTo).toHaveBeenCalledTimes(1);
});
