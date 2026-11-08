import { useRef } from "react";
import type { ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import { FieldError } from "@/components/field-error";
import { LIST_INSET } from "@/components/list-inset";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import { Label, getInputTextStyle } from "@/components/typography";
import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from "@/constants/config";
import { SPACE } from "@/constants/space";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { isValidTagTitle, shouldShowCounter } from "../tag-name";

/**
 * Tag or tag category name input with a visible label, an `n/MAX` counter near the limit, and
 * an inline error. Tapping the label focuses the input. The input sits in a
 * {@link MenuList} so it matches the other form sections. `leading` sits
 * before the input, inset {@link SPACE.md} from the row edge, like the tag
 * icon button.
 */
const TagNameField = ({
  value,
  onChange,
  showError,
  placeholder = t("tags_add_placeholder"),
  testID = "tag-name",
  autoFocus = false,
  onSubmit,
  leading,
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
  /** Element before the input, like the tag icon button. */
  leading?: ReactNode;
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
        <MenuListHeadline nativeID="tag-name-label">
          {t("tags_name_label")}
        </MenuListHeadline>
      </Pressable>
      <MenuList>
        <View
          style={
            leading
              ? {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACE.md,
                  padding: SPACE.md,
                }
              : undefined
          }
        >
          {leading}
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
              ...(leading
                ? { flex: 1, paddingVertical: SPACE.md, paddingRight: SPACE.xs }
                : { width: "100%", padding: LIST_INSET }),
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
        </View>
      </MenuList>
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: LIST_INSET,
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
