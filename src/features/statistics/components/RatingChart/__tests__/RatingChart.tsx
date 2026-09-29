import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";
import Colors from "@/constants/Colors";
import { RatingChart } from "@/features/statistics/components/RatingChart";
import { SettingsProvider } from "@/state/settings";

const flatData = [4, 4, 4, 4, 4].map((value, index) => ({
  key: `${index}`,
  count: 1,
  value,
}));

describe("RatingChart", () => {
  it("draws the average line on the same row as a flat mood line", async () => {
    const { findByTestId, getByTestId } = await render(
      <NavigationContainer
        theme={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <SettingsProvider>
          <RatingChart showAverage data={flatData} width={320} height={128} />
        </SettingsProvider>
      </NavigationContainer>
    );

    // react-native-svg renders the Polyline as a path: "M<x> <y> <x> <y> ...".
    const moodLine = await findByTestId("rating-chart-line");
    const moodY = Number(moodLine.props.d.slice(1).split(" ")[1]);

    expect(getByTestId("rating-chart-average").props.y1).toBe(moodY);
  });
});
