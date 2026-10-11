import { forwardRef, useState } from "react";
import { ScrollView } from "react-native";
import type { TextInput } from "react-native";

import TextArea from "@/components/TextArea";

const ScrollingNoteInputComponent = (
  {
    value,
    onChange,
    placeholder,
    accessibilityLabel,
    testID,
    maxLength,
    bottomInset,
  }: {
    value: string;
    onChange: (text: string) => void;
    placeholder: string;
    accessibilityLabel: string;
    testID: string;
    maxLength: number;
    bottomInset: number;
  },
  ref: React.ForwardedRef<TextInput>
) => {
  const [viewportHeight, setViewportHeight] = useState(0);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      contentInset={{ bottom: bottomInset }}
      scrollIndicatorInsets={{ bottom: bottomInset }}
      keyboardShouldPersistTaps="handled"
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
    >
      <TextArea
        ref={ref}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        scrollEnabled={false}
        style={{
          height: undefined,
          minHeight: viewportHeight - bottomInset,
          marginBottom: 0,
          borderWidth: 0,
          backgroundColor: "transparent",
          paddingHorizontal: 0,
          paddingTop: 8,
          paddingBottom: 16,
          fontSize: 18,
          lineHeight: 26,
        }}
      />
    </ScrollView>
  );
};

/**
 * Note input that keeps its caret line clear of `bottomInset`, the space the
 * floating next/save button covers above the keyboard.
 *
 * iOS scrolls a multiline input to the caret and ignores its bottom padding,
 * so the caret line would end under the button. Shrinking the input instead
 * would cost writing space. This input does not scroll itself: it grows with
 * its text inside a `ScrollView` that fills the slide. iOS scrolls that
 * `ScrollView` to the caret and keeps `contentInset.bottom` clear, so the
 * text still uses the full height when scrolled.
 */
export const ScrollingNoteInput = forwardRef(ScrollingNoteInputComponent);
