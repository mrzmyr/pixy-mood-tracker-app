import { useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from "@/constants/Config";
import MenuList from "@/components/MenuList";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { isValidTagTitle, shouldShowCounter } from "../tagName";

/**
 * Tag name input with a visible label, an `n/MAX` counter near the limit, and
 * an inline error. Tapping the label focuses the input. The input sits in a
 * {@link MenuList} so it matches the other form sections.
 */
const TagNameField = ({
  value,
  onChange,
  showError,
}: {
  value: string;
  onChange: (title: string) => void;
  /** Show the length error under the field. */
  showError: boolean;
}) => {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const hasError = showError && !isValidTagTitle(value);
  const showCounter = shouldShowCounter(value.length);

  return (
    <View style={{ marginBottom: 24 }}>
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
      <MenuList>
        <TextInput
          ref={inputRef}
          accessibilityLabel={t("tags_name_label")}
          accessibilityLabelledBy="tag-name-label"
          testID="tag-name"
          autoCorrect={false}
          style={{
            fontSize: 17,
            color: colors.textInputText,
            width: "100%",
            padding: 16,
          }}
          placeholder={t("tags_add_placeholder")}
          placeholderTextColor={colors.textInputPlaceholder}
          maxLength={MAX_TAG_LENGTH}
          value={value}
          onChangeText={onChange}
        />
      </MenuList>
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: hasError || showCounter ? 6 : 0,
        }}
      >
        {hasError && (
          <Text
            testID="tag-name-error"
            style={{ flex: 1, fontSize: 13, color: colors.dangerButtonText }}
          >
            {t("tags_name_error", {
              min: MIN_TAG_LENGTH,
              max: MAX_TAG_LENGTH,
            })}
          </Text>
        )}
        {showCounter && (
          <Text
            testID="tag-name-counter"
            style={{
              marginLeft: "auto",
              fontSize: 13,
              color: colors.textSecondary,
            }}
          >
            {value.length}/{MAX_TAG_LENGTH}
          </Text>
        )}
      </View>
    </View>
  );
};

export default TagNameField;
