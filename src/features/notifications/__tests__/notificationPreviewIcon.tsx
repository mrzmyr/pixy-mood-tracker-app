import { render, screen } from "@testing-library/react-native";
import { getAppIconName } from "expo-alternate-app-icons";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { APP_ICONS } from "@/constants/AppIcons";
import NotificationPreview from "../components/NotificationPreview";

const mockGetIconName = jest.mocked(getAppIconName);

const renderPreview = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <NotificationPreview time={new Date(2026, 9, 6, 20, 0)} enabled />
    </ThemeProvider>
  );

describe("iOS NotificationPreview app icon", () => {
  afterEach(() => {
    mockGetIconName.mockReturnValue(null);
  });

  it("shows the default icon when no alternate icon is active", async () => {
    mockGetIconName.mockReturnValue(null);
    await renderPreview();
    expect(screen.getByTestId("reminder-preview-icon").props.source).toBe(
      APP_ICONS[0].preview
    );
  });

  it("shows the icon the user selected", async () => {
    mockGetIconName.mockReturnValue("TangerineInverse");
    await renderPreview();
    const selected = APP_ICONS.find((icon) => icon.id === "tangerine-inverse");
    expect(screen.getByTestId("reminder-preview-icon").props.source).toBe(
      selected?.preview
    );
  });
});
