import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { render, userEvent } from "@testing-library/react-native";
import { HeaderNavigation } from "../screens/Onboarding/HeaderNavigation";

const renderHeader = async (index: number) => {
  const onSkip = jest.fn();
  const setIndex = jest.fn();
  const result = await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <HeaderNavigation index={index} setIndex={setIndex} onSkip={onSkip} />
    </ThemeProvider>
  );
  return { ...result, onSkip, setIndex };
};

describe("Onboarding header navigation", () => {
  test.each([1, 2, 3, 4])(
    "slide %i marks exactly its own dot active",
    async (index) => {
      const { getAllByTestId } = await renderHeader(index);
      const dots = getAllByTestId("onboarding-pagination-dot");

      expect(dots).toHaveLength(4);
      const selected = dots.map((dot) => dot.props.accessibilityState.selected);
      expect(selected.indexOf(true)).toBe(index - 1);
      expect(selected.filter(Boolean)).toHaveLength(1);
    }
  );

  test("pressing the skip button calls onSkip and does not advance", async () => {
    const { getByTestId, onSkip, setIndex } = await renderHeader(2);

    await userEvent.press(getByTestId("onboarding-skip"));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(setIndex).not.toHaveBeenCalled();
  });

  test("pressing back goes to the previous slide", async () => {
    const { getByTestId, setIndex } = await renderHeader(3);

    await userEvent.press(getByTestId("onboarding-back"));

    expect(setIndex).toHaveBeenCalledWith(2);
  });
});
