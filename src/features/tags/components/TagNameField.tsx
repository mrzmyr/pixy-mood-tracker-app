import { useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from "@/constants/Config";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { isValidTagTitle, shouldShowCounter } from "../tagName";

/**
 * Tag or tag category name input with a visible label, an `n/MAX` counter near the limit, and
 * an inline error. Tapping the label focuses the input.
 */
const TagNameField = ({
  value,
  onChange,
  showError,
  placeholder = t("tags_add_placeholder"),
  testID = "tag-name",
  autoFocus = false,
}: {
  value: string;
  placeholder?: string;
  testID?: string;
  autoFocus?: boolean;
  onChange: (title: string) => void;
  /** Show the length error under the field. */
  showError: boolean;
}) => {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const hasError = showError && !isValidTagTitle(value);

  return (
    <View style={{ marginBottom: 16 }}>
      <Pressable
        accessible={false}
        onPress={() => inputRef.current?.focus()}
        style={{ paddingBottom: 8 }}
      >
        <Text
          nativeID="tag-name-label"
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.textSecondary,
          }}
        >
          {t("tags_name_label")}
        </Text>
      </Pressable>
      <TextInput
        ref={inputRef}
        accessibilityLabel={t("tags_name_label")}
        accessibilityLabelledBy="tag-name-label"
        testID={testID}
        autoFocus={autoFocus}
        autoCorrect={false}
        style={{
          fontSize: 17,
          color: colors.textInputText,
          backgroundColor: colors.textInputBackground,
          width: "100%",
          padding: 16,
          borderRadius: RADIUS.sm,
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textInputPlaceholder}
        maxLength={MAX_TAG_LENGTH}
        value={value}
        onChangeText={onChange}
      />
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <Text
          testID={`${testID}-error`}
          style={{ flex: 1, fontSize: 13, color: colors.dangerButtonText }}
        >
          {hasError
            ? t("tags_name_error", {
                min: MIN_TAG_LENGTH,
                max: MAX_TAG_LENGTH,
              })
            : ""}
        </Text>
        {shouldShowCounter(value.length) && (
          <Text
            testID={`${testID}-counter`}
            style={{ fontSize: 13, color: colors.textSecondary }}
          >
            {value.length}/{MAX_TAG_LENGTH}
          </Text>
        )}
      </View>
    </View>
  );
};

export default TagNameField;
