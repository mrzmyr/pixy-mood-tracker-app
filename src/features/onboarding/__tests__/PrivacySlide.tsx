import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, userEvent } from "@testing-library/react-native";
import Colors from "@/constants/Colors";
import { PrivacySlide } from "../screens/Onboarding/PrivacySlide";

describe("PrivacySlide", () => {
  test("says analytics is on and finishes on Understood", async () => {
    const onPress = jest.fn();
    const result = await render(
      <ThemeProvider
        value={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        <PrivacySlide onPress={onPress} />
      </ThemeProvider>
    );

    expect(result.getByText("Hey, this is Moritz 👋")).toBeTruthy();
    expect(result.getByText("Anonymous usage data is on.")).toBeTruthy();
    await userEvent.press(result.getByText("Understood"));
    expect(onPress).toHaveBeenCalled();
  });
});
