import { render } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import Scale from "../scale";

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

describe("Scale accessibility", () => {
  test("single value: only the current rating is a selected radio", async () => {
    const result = await render(
      withTheme(<Scale type="ColorBrew-RdYlGn" value="good" />)
    );

    const selected = result.getAllByRole("radio", { selected: true });
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAccessibleName("good");
    expect(result.getAllByRole("radio", { selected: false })).toHaveLength(6);
  });

  test("several values: each picked rating is a checked checkbox", async () => {
    const result = await render(
      withTheme(
        <Scale type="ColorBrew-RdYlGn" value={["very_bad", "very_good"]} />
      )
    );

    expect(result.queryAllByRole("radio")).toHaveLength(0);
    const checked = result.getAllByRole("checkbox", { checked: true });
    expect(checked.map((node) => node.props.accessibilityLabel).sort()).toEqual(
      ["very_bad", "very_good"]
    );
  });
});
