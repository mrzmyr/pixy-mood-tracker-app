import { Pressable, TextInput, View } from "react-native";
import { getInputTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import Search from "lucide-react-native/icons/search";
import CircleX from "lucide-react-native/icons/circle-x";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";
import { SPACE } from "@/constants/space";

/** Controlled search field with a clear button. Empty `value` hides the button. */
export const SearchInput = ({
  value,
  onChange,
  placeholder = t("calendar_filters_search"),
  testID,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  testID?: string;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.textInputBorder,
        backgroundColor: colors.textInputBackground,
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        padding: SPACE.sm,
      }}
    >
      <View
        style={{
          marginLeft: SPACE.xs,
        }}
      >
        <Search color={colors.textInputPlaceholder} width={20} />
      </View>
      <TextInput
        accessibilityLabel={placeholder}
        testID={testID}
        placeholder={placeholder}
        value={value}
        placeholderTextColor={colors.textInputPlaceholder}
        style={{
          flex: 1,
          color: colors.textInputText,
          marginLeft: SPACE.md,
          ...getInputTextStyle(16),
          width: "100%",
          borderRadius: RADIUS.sm,
          borderCurve: "continuous",
        }}
        onChangeText={onChange}
      />
      {value !== "" && (
        <Pressable
          accessibilityLabel={t("clear")}
          accessibilityRole="button"
          style={{
            paddingRight: SPACE.sm,
            padding: SPACE.sm,
            margin: -8,
          }}
          onPress={() => onChange("")}
        >
          <CircleX color={colors.textInputPlaceholder} width={20} />
        </Pressable>
      )}
    </View>
  );
};
