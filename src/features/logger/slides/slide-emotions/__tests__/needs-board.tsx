import { useState } from "react";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, screen, userEvent } from "@testing-library/react-native";
import Colors from "@/constants/colors";
import { SettingsProvider } from "@/state/settings";
import type { Emotion } from "@/types";
import { EMOTIONS } from "../../../config";
import { NeedsCheck } from "../needs-check";
import type { NeedStates } from "../needs";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const Harness = () => {
  const [states, setStates] = useState<NeedStates>({});
  const [selected, setSelected] = useState<Emotion[]>([]);
  return (
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <NeedsCheck
          states={states}
          onChange={(key, state) =>
            setStates((current) => ({ ...current, [key]: state }))
          }
          emotions={EMOTIONS}
          selectedEmotions={selected}
          onPressEmotion={(emotion) =>
            setSelected((current) =>
              current.some((e) => e.key === emotion.key)
                ? current.filter((e) => e.key !== emotion.key)
                : [...current, emotion]
            )
          }
        />
      </SettingsProvider>
    </ThemeProvider>
  );
};

const happy = EMOTIONS.find((e) => e.key === "happy");

describe("NeedsCheck board", () => {
  test("rating a need and picking a feeling in its sheet shows both on the tile", async () => {
    await render(<Harness />);

    await userEvent.press(screen.getByTestId("needs-joy"));
    await userEvent.press(screen.getByTestId("needs-sheet-rating-met"));
    await userEvent.press(screen.getByLabelText(happy?.label ?? ""));
    await userEvent.press(screen.getByTestId("needs-sheet-done"));

    expect(screen.getByTestId("needs-joy-state")).toHaveTextContent("Met");
    expect(screen.getByTestId("needs-joy-picked")).toHaveTextContent(
      happy?.label ?? ""
    );
  });

  test("More shows the feelings beyond the first 8", async () => {
    await render(<Harness />);

    await userEvent.press(screen.getByTestId("needs-joy"));
    await userEvent.press(screen.getByTestId("needs-sheet-rating-met"));
    const before = screen.getAllByRole("checkbox").length;
    await userEvent.press(screen.getByTestId("needs-sheet-more"));

    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(before);
  });
});
