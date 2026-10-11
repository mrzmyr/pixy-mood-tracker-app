import { useEffect } from "react";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { _generateItem } from "@/__tests__/utils";
import { SettingsProvider } from "@/state/settings";
import { LogDraftProvider, useLogDraft } from "../logDraft";
import { SlideMenstruation } from "../slides/SlideMenstruation";

test("select advances with latest flow; tapping selected flow clears and stays", async () => {
  let draft: ReturnType<typeof useLogDraft> | undefined;
  const advancedFlows: string[] = [];
  const Harness = () => {
    const currentDraft = useLogDraft();
    useEffect(() => {
      draft = currentDraft;
    }, [currentDraft]);
    return (
      <SlideMenstruation
        showDisable
        onDisableStep={() => {}}
        onSelect={() =>
          advancedFlows.push(draft?.draft.menstruation?.flow ?? "missing")
        }
      />
    );
  };
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <SettingsProvider>
          <LogDraftProvider initialDraft={_generateItem({})}>
            <Harness />
          </LogDraftProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
  await fireEvent.press(screen.getByTestId("menstruation-flow-none"));
  await waitFor(() => expect(advancedFlows).toEqual(["none"]));
  expect(
    screen.getByTestId("menstruation-flow-none").props.accessibilityState
  ).toEqual({ selected: true });
  await fireEvent.press(screen.getByTestId("menstruation-flow-none"));
  expect(draft?.draft.menstruation).toBeUndefined();
  expect(
    screen.getByTestId("menstruation-flow-none").props.accessibilityState
  ).toEqual({ selected: false });
  expect(advancedFlows).toEqual(["none"]);
});
