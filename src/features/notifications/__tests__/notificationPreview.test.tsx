import { render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import NotificationPreview from "../components/NotificationPreview.android";

const renderPreview = ({ enabled }: { enabled: boolean }) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <NotificationPreview
        time={new Date(2026, 9, 6, 20, 0)}
        enabled={enabled}
      />
    </ThemeProvider>
  );

describe("Android NotificationPreview", () => {
  it("describes the reminder to screen readers", async () => {
    await renderPreview({ enabled: true });
    expect(screen.getByLabelText(/8:00/u)).toBeTruthy();
  });

  it("dims the preview when the reminder is off", async () => {
    await renderPreview({ enabled: false });
    expect(screen.getByTestId("reminder-preview")).toHaveStyle({
      opacity: 0.5,
    });
  });

  it("shows the preview at full strength when the reminder is on", async () => {
    await renderPreview({ enabled: true });
    expect(screen.getByTestId("reminder-preview")).toHaveStyle({ opacity: 1 });
  });
});
