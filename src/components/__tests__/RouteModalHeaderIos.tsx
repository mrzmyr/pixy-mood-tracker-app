import { fireEvent, waitFor } from "@testing-library/react-native";
import { Stack, useRouter } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Pressable, Text } from "react-native";

import RouteModalHeader from "@/components/RouteModalHeader.ios";

const onSave = jest.fn();

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
  return (
    <>
      <RouteModalHeader
        title="Create Tag"
        onClose={() => router.back()}
        closeTestID="tag-cancel"
        action={
          <Pressable testID="tag-save" onPress={onSave}>
            <Text>Save</Text>
          </Pressable>
        }
      />
      <Text>Form body</Text>
    </>
  );
};

describe("iOS RouteModalHeader", () => {
  // One test: the router store breaks a second render in the same file.
  test("native bar Save runs the action and Cancel closes the form", async () => {
    // The router store settles on fake timers; presses run on real ones.
    jest.useFakeTimers();
    const screen = await renderRouter(
      {
        _layout: () => (
          <Stack>
            <Stack.Screen
              name="form"
              options={{ presentation: "modal", headerShown: true }}
            />
          </Stack>
        ),
        index: Home,
        form: Form,
      },
      { initialUrl: "/" }
    );
    jest.useRealTimers();

    await fireEvent.press(await screen.findByText("Open form"));
    await screen.findByText("Form body");

    await fireEvent.press(await screen.findByTestId("tag-save"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Form body")).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId("tag-cancel"));
    await waitFor(() =>
      expect(screen.queryByText("Form body")).not.toBeOnTheScreen()
    );
  });
});
