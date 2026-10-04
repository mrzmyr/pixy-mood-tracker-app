import { render, screen, waitFor } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { LogsProvider } from "@/features/logs";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { Entry } from "../screens/LogList/Entry";

let mockIsPhotosEnabled = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the photos flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  useFeatureFlag: () => mockIsPhotosEnabled,
}));

const photo: LogPhoto = {
  id: "photo-1",
  fileName: "photo-1.jpg",
  width: 1200,
  height: 1600,
  createdAt: "2026-10-02T10:00:00.000Z",
  source: "day",
  libraryId: "library-1",
};

const Loaded = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useSettings();
  return settings.loaded ? children : null;
};

const renderEntry = ({ photos }: { photos: LogPhoto[] }) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider>
          <LogsProvider>
            <TagsProvider>
              <Loaded>
                <Entry
                  item={_generateItem({ photos })}
                  onEdit={jest.fn()}
                  onDelete={jest.fn()}
                />
              </Loaded>
            </TagsProvider>
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

describe("day view photos section", () => {
  afterEach(() => {
    mockIsPhotosEnabled = true;
  });

  test("flag on, no photos: empty line with pencil, no add tile", async () => {
    await renderEntry({ photos: [] });

    await waitFor(() => {
      expect(screen.getByTestId("log-list-photos")).toBeTruthy();
    });
    expect(screen.getByText("No photos yet.")).toBeTruthy();
    expect(screen.getByTestId("log-list-photos-edit")).toBeTruthy();
    expect(screen.getByLabelText("Edit Photos")).toBeTruthy();
    expect(screen.queryByTestId("photo-add-tile")).toBeNull();
  });

  test("flag on, with photos: one thumbnail per photo", async () => {
    await renderEntry({ photos: [photo] });

    await waitFor(() => {
      expect(screen.getByLabelText("Photo 1 of 1")).toBeTruthy();
    });
    expect(screen.queryByText("No photos yet.")).toBeNull();
    expect(screen.getByTestId("log-list-photos-edit")).toBeTruthy();
  });

  test("flag off, with photos: stored photos stay, no pencil", async () => {
    mockIsPhotosEnabled = false;
    await renderEntry({ photos: [photo] });

    await waitFor(() => {
      expect(screen.getByLabelText("Photo 1 of 1")).toBeTruthy();
    });
    expect(screen.queryByTestId("log-list-photos-edit")).toBeNull();
  });

  test("flag off, no photos: no photos section", async () => {
    mockIsPhotosEnabled = false;
    await renderEntry({ photos: [] });

    await waitFor(() => {
      expect(screen.getByText("Tags")).toBeTruthy();
    });
    expect(screen.queryByTestId("log-list-photos")).toBeNull();
  });
});
