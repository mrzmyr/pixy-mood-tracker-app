import { useState } from "react";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, screen, userEvent } from "@testing-library/react-native";
import Colors from "@/constants/colors";
import { NeedRating } from "../need-rating";
import type { NeedState } from "../needs";

const Harness = () => {
  const [state, setState] = useState<NeedState | undefined>();
  return (
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <NeedRating
        label="Rest & Body"
        state={state}
        onChange={setState}
        testID="need"
      />
    </ThemeProvider>
  );
};

describe("NeedRating", () => {
  test("tapping the selected segment again clears the rating", async () => {
    await render(<Harness />);
    const partly = screen.getByTestId("need-partly");

    await userEvent.press(partly);
    expect(partly).toBeSelected();

    await userEvent.press(partly);
    expect(partly).not.toBeSelected();
  });

  test("tapping another segment switches the rating", async () => {
    await render(<Harness />);

    await userEvent.press(screen.getByTestId("need-partly"));
    await userEvent.press(screen.getByTestId("need-met"));

    expect(screen.getByTestId("need-met")).toBeSelected();
    expect(screen.getByTestId("need-partly")).not.toBeSelected();
  });
});
