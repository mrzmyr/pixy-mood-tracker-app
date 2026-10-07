import { Text, View } from "react-native";
import { MoodCharacter } from "@/components/MoodCharacter";
import MenuListHeadline from "@/components/MenuListHeadline";
import { MoodThemeSchema } from "@/constants/MoodThemes";
import { RATING_KEYS } from "@/constants/Ratings";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import { Radio } from "./Radio";

/** Preview all seven expressions before choosing a persisted character appearance. */
export const MoodThemes = () => {
  const colors = useColors();
  const { settings, setSettings } = useSettings();
  return (
    <View>
      <MenuListHeadline style={{ marginTop: 8 }}>
        {t("mood_themes")}
      </MenuListHeadline>
      {MoodThemeSchema.options.map((theme) => (
        <Radio
          key={theme}
          label={t(`mood_theme_${theme}`)}
          testID={`mood-theme-${theme}`}
          isSelected={settings.moodTheme === theme}
          onPress={() =>
            setSettings((current) => ({ ...current, moodTheme: theme }))
          }
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            {t(`mood_theme_${theme}`)}
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {RATING_KEYS.map((rating) => (
              <View key={rating} style={{ flex: 1, aspectRatio: 1 }}>
                <MoodCharacter
                  theme={theme}
                  rating={rating}
                  color={colors.scales[settings.scaleType][rating].background}
                  size="100%"
                />
              </View>
            ))}
          </View>
        </Radio>
      ))}
    </View>
  );
};
