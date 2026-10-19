import { useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { ROLE_PRESETS, type RolePreset } from "../role-presets";

interface RolePickerProps {
  value: string | undefined;
  onChange: (role: string | undefined) => void;
  testID?: string;
}

/**
 * Role picker with preset roles and custom role input.
 * Displays a list of preset roles plus a custom input field.
 */
export const RolePicker = ({ value, onChange, testID }: RolePickerProps) => {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const [customRole, setCustomRole] = useState(
    value && !ROLE_PRESETS.includes(value as RolePreset) ? value : ""
  );
  const isCustom = customRole.trim().length > 0;

  const handlePresetSelect = (preset: RolePreset) => {
    if (value === preset) {
      onChange(undefined);
      setCustomRole("");
    } else {
      onChange(preset);
      setCustomRole("");
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomRole(text);
    if (text.trim().length > 0) {
      onChange(text.trim());
    } else {
      onChange(undefined);
    }
  };

  const getCheckmark = (preset: RolePreset) => {
    if (value === preset && !isCustom) {
      return (
        <Text style={{ fontSize: 17, color: colors.tint }}>
          {isIOS ? "✓" : "✓"}
        </Text>
      );
    }
    return null;
  };

  return (
    <View>
      <MenuListHeadline>{t("people_role")}</MenuListHeadline>
      <MenuList>
        {ROLE_PRESETS.map((preset) => (
          <MenuListItem
            key={preset}
            testID={`${testID}-${preset}`}
            title={t(`people_role_${preset}` as never)}
            onPress={() => handlePresetSelect(preset)}
            iconRight={getCheckmark(preset)}
          />
        ))}
      </MenuList>
      <View style={{ marginTop: 12 }}>
        <TextInput
          accessibilityLabel={t("people_role_custom")}
          testID={`${testID}-custom`}
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={{
            fontSize: isIOS ? 17 : 16,
            color: colors.textInputText,
            backgroundColor: isIOS
              ? colors.menuListItemBackground
              : colors.textInputBackground,
            width: "100%",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: isIOS ? RADIUS.md : RADIUS.sm,
          }}
          placeholder={t("people_role_custom_placeholder")}
          placeholderTextColor={colors.textInputPlaceholder}
          maxLength={30}
          value={customRole}
          onChangeText={handleCustomChange}
        />
      </View>
    </View>
  );
};
