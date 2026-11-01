import { useRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import { FieldError } from "@/components/field-error";
import MenuList from "@/components/menu-list";
import { Label, getInputTextStyle } from "@/components/typography";
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from "@/constants/config";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { isValidTagTitle, shouldShowCounter } from "../tag-name";

/**
 * Tag or tag category name input with a visible label, an `n/MAX` counter near the limit, and
 * an inline error. Tapping the label focuses the input. The input sits in a
 * {@link MenuList} so it matches the other form sections.
 */
const TagNameField = ({
  value,
  onChange,
  showError,
  placeholder = t("tags_add_placeholder"),
  testID = "tag-name",
  autoFocus = false,
  onSubmit,
}: {
  value: string;
  placeholder?: string;
  testID?: string;
  autoFocus?: boolean;
  onChange: (title: string) => void;
  /** Runs on the keyboard Return key, labelled "done". */
  onSubmit?: () => void;
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
        <Label
          size={13}
          strong
          nativeID="tag-name-label"
          style={{
            color: colors.textSecondary,
          }}
        >
          {t("tags_name_label")}
        </Label>
      </Pressable>
      <MenuList>
        <TextInput
          ref={inputRef}
          accessibilityLabel={t("tags_name_label")}
          accessibilityLabelledBy="tag-name-label"
          testID={testID}
          autoFocus={autoFocus}
          autoCorrect={false}
          style={{
            ...getInputTextStyle(16),
            color: colors.textInputText,
            width: "100%",
            padding: 16,
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textInputPlaceholder}
          maxLength={MAX_TAG_LENGTH}
          value={value}
          returnKeyType="done"
          // Keep the keyboard up so a too-short name can be fixed right away.
          submitBehavior="submit"
          onSubmitEditing={onSubmit}
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
          <FieldError testID={`${testID}-error`} style={{ flex: 1 }}>
            {t("tags_name_error", {
              min: MIN_TAG_LENGTH,
              max: MAX_TAG_LENGTH,
            })}
          </FieldError>
        )}
        {showCounter && (
          <Label
            size={13}
            testID={`${testID}-counter`}
            style={{
              marginLeft: "auto",
              color: colors.textSecondary,
              fontVariant: ["tabular-nums"],
            }}
          >
            {value.length}/{MAX_TAG_LENGTH}
          </Label>
        )}
      </View>
    </View>
  );
};

export default TagNameField;
