import { AccessibilityInfo, Platform } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { InlineAlert } from "@/components/InlineAlert";

const renderAlert = (element: React.ReactElement) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      {element}
    </ThemeProvider>
  );

describe("InlineAlert", () => {
  test("screen reader user finds the error as an alert", async () => {
    await renderAlert(<InlineAlert title="Not sent" message="Try again." />);

    expect(screen.getByRole("alert")).toHaveAccessibleName(
      /Not sent.*Try again\./u
    );
  });

  test("user retries from the alert action", async () => {
    const onRetry = jest.fn();
    await renderAlert(
      <InlineAlert
        message="Try again."
        action={{ label: "Retry", onPress: onRetry }}
      />
    );

    await userEvent.press(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("VoiceOver announces the alert when it appears", async () => {
    const original = Platform.OS;
    Platform.OS = "ios";
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation();
    try {
      await renderAlert(<InlineAlert title="Not sent" message="Try again." />);

      expect(announce).toHaveBeenCalledWith("Not sent. Try again.");
    } finally {
      Platform.OS = original;
      announce.mockRestore();
    }
  });
});
