import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { render } from "@testing-library/react-native";

import Colors from "@/constants/Colors";

import TextArea from "../TextArea";

const renderField = (props: React.ComponentProps<typeof TextArea>) =>
  render(
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <TextArea testID="field" {...props} />
    </NavigationContainer>
  );

describe("<TextArea> accessibility label", () => {
  test("uses accessibilityLabel over placeholder", async () => {
    const { getByTestId } = await renderField({
      accessibilityLabel: "Question",
      placeholder: "Placeholder",
    });
    expect(getByTestId("field").props.accessibilityLabel).toBe("Question");
  });

  test("falls back to placeholder", async () => {
    const { getByTestId } = await renderField({ placeholder: "Placeholder" });
    expect(getByTestId("field").props.accessibilityLabel).toBe("Placeholder");
  });

  test("passes no label when both are empty", async () => {
    const { getByTestId } = await renderField({});
    expect(getByTestId("field").props.accessibilityLabel).toBeUndefined();
  });
});
