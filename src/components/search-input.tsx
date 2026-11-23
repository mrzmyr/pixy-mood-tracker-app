import { Pressable, TextInput, View } from "react-native";
import Search from "lucide-react-native/icons/search";
import CircleX from "lucide-react-native/icons/circle-x";

import { FIELD_HEIGHT } from "@/components/text-field";
import { getInputTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";
import { SPACE } from "@/constants/space";

const ICON_SIZE = 18;

/**
 * Controlled search field with a clear button. Empty `value` hides the
 * button. Capsule like `Button` and the iOS search bar, platform field gray.
 * Screens with a native header bar on iOS use `headerSearchBarOptions`.
 */
export const SearchInput = ({
  ref,
  value,
  onChange,
  placeholder = t("calendar_filters_search"),
  testID,
  autoFocus,
  onBlur,
}: {
  ref?: React.Ref<TextInput>;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  testID?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACE.sm,
        height: FIELD_HEIGHT,
        paddingHorizontal: SPACE.md,
        backgroundColor: colors.textInputBackground,
        borderRadius: RADIUS.full,
        borderCurve: "continuous",
      }}
    >
      <Search color={colors.textInputPlaceholder} width={ICON_SIZE} />
      <TextInput
        ref={ref}
        accessibilityLabel={placeholder}
        testID={testID}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        placeholderTextColor={colors.textInputPlaceholder}
        returnKeyType="search"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
        style={{
          flex: 1,
          height: FIELD_HEIGHT,
          color: colors.textInputText,
          ...getInputTextStyle(16),
        }}
        onChangeText={onChange}
        onBlur={onBlur}
      />
      {value !== "" && (
        <Pressable
          accessibilityLabel={t("clear")}
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => onChange("")}
        >
          <CircleX color={colors.textInputPlaceholder} width={ICON_SIZE} />
        </Pressable>
      )}
    </View>
  );
};
