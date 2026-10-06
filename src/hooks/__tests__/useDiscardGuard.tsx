import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { Stack, useRouter } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import noop from "lodash/noop";
import { useState } from "react";
import { Alert, Pressable, Text } from "react-native";
import { useDiscardGuard } from "../useDiscardGuard";

const Home = () => {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/form")}>
      <Text>Open form</Text>
    </Pressable>
  );
};

const Form = () => {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [discards, setDiscards] = useState(0);
  const { allowLeave } = useDiscardGuard({
    isDirty,
    onDiscard: () => setDiscards((count) => count + 1),
  });
  return (
    <>
      <Text>{`Form, discards ${discards}`}</Text>
      <Pressable onPress={() => setIsDirty(true)}>
        <Text>Edit</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text>Back</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          allowLeave();
          router.back();
        }}
      >
        <Text>Save</Text>
      </Pressable>
    </>
  );
};

const renderForm = async () => {
  const result = await renderRouter(
    { _layout: () => <Stack />, index: Home, form: Form },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  fireEvent.press(await result.findByText("Open form"));
  await result.findByText("Form, discards 0");
  return result;
};

// Presses a button of the latest prompt by its style.
const pressPrompt = (style: "destructive" | "cancel") => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  buttons.find((button) => button.style === style)?.onPress?.();
};

let alert: jest.SpyInstance | undefined;

describe("useDiscardGuard()", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    alert = jest.spyOn(Alert, "alert").mockImplementation(noop);
  });

  afterEach(() => {
    alert?.mockRestore();
  });

  // One test: the router store breaks a second render in the same file.
  test("asks before a changed form closes, never when clean or after allowLeave", async () => {
    const result = await renderForm();

    // Clean form closes at once.
    fireEvent.press(result.getByText("Back"));
    fireEvent.press(await result.findByText("Open form"));

    // `allowLeave` skips the prompt for a changed form.
    fireEvent.press(await result.findByText("Edit"));
    fireEvent.press(result.getByText("Save"));
    expect(Alert.alert).not.toHaveBeenCalled();
    fireEvent.press(await result.findByText("Open form"));

    // Changed form: cancel keeps it, confirm closes it, one prompt each.
    fireEvent.press(await result.findByText("Edit"));
    fireEvent.press(result.getByText("Back"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    await act(() => Promise.resolve(pressPrompt("cancel")));
    expect(result.getByText("Form, discards 0")).toBeOnTheScreen();

    fireEvent.press(result.getByText("Back"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(2));
    await act(() => Promise.resolve(pressPrompt("destructive")));
    expect(await result.findByText("Open form")).toBeOnTheScreen();
    expect(Alert.alert).toHaveBeenCalledTimes(2);
  });
});
