import { useState } from "react";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, screen, userEvent } from "@testing-library/react-native";
import Colors from "@/constants/colors";
import { SettingsProvider } from "@/state/settings";
import { EMOTIONS } from "../../../config";
import { NeedsCheck } from "../needs-check";
import type { NeedStates } from "../needs";

const Harness = () => {
  const [states, setStates] = useState<NeedStates>({});
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
          selectedEmotions={[]}
          onPressEmotion={() => {}}
        />
      </SettingsProvider>
    </ThemeProvider>
  );
};

describe("NeedsCheck", () => {
  test("feelings show only after rating and pressing Show Feelings", async () => {
    await render(<Harness />);
    expect(screen.queryByTestId("needs-body-show")).toBeNull();

    await userEvent.press(screen.getByTestId("needs-body-control-unmet"));
    expect(screen.queryByTestId("needs-body-feelings")).toBeNull();

    await userEvent.press(screen.getByTestId("needs-body-show"));

    expect(screen.getByTestId("needs-body-feelings")).toBeTruthy();
    expect(screen.queryByTestId("needs-body-show")).toBeNull();
  });

  test("clearing the rating hides the feelings", async () => {
    await render(<Harness />);
    const unmet = screen.getByTestId("needs-body-control-unmet");
    await userEvent.press(unmet);
    await userEvent.press(screen.getByTestId("needs-body-show"));

    await userEvent.press(unmet);

    expect(screen.queryByTestId("needs-body-feelings")).toBeNull();
    expect(screen.queryByTestId("needs-body-show")).toBeNull();
  });
});
