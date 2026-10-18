import { DefaultTheme, ThemeProvider } from "expo-router";
import { fireEvent, render } from "@testing-library/react-native";

import Colors from "@/constants/Colors";

import TextArea from "@/components/TextArea";

const renderField = (props: React.ComponentProps<typeof TextArea>) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <TextArea testID="field" {...props} />
    </ThemeProvider>
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

xdescribe("<TextArea>", () => {
  test("should call onChange", async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(
      <TextArea
        onChange={onChange}
        value="Text value"
        placeholder="message placeholder"
        maxLength={50}
      />
    );
    const textInput = getByPlaceholderText("message placeholder");
    fireEvent.changeText(textInput, "test message");
    expect(onChange).toHaveBeenCalledWith("test message");
  });

  test("should set initial value", async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(
      <TextArea
        onChange={onChange}
        value="Text value"
        placeholder="message placeholder"
        maxLength={50}
      />
    );
    const textInput = getByPlaceholderText("message placeholder");
    expect(textInput.props.value).toBe("Text value");
  });

  test("should cut off string longer than maxLength", async () => {
    const { getByPlaceholderText } = await render(
      <TextArea
        value="Text value"
        placeholder="message placeholder"
        maxLength={50}
      />
    );

    const textInput = getByPlaceholderText("message placeholder");
    fireEvent.changeText(
      textInput,
      "test message test message test message test message test message test message test message test message test message"
    );

    expect(textInput.props.value).toBe(
      "test message test message test message test messag"
    );
  });
});
