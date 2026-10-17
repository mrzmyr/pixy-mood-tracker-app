import { Fragment } from "react";
import { ScrollView, View } from "react-native";
import TextInfo from "@/components/TextInfo";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { useScrollBottomPadding } from "@/hooks/useScrollBottomPadding";
import { useSettings } from "@/state/settings";
import type { SettingsState } from "@/state/settings";
import { Radio } from "./Radio";
import { Scale } from "./Scale";

const typesNames = [
  { id: `ColorBrew-RdYlGn` },
  { id: `ColorBrew-RdYG` },
  { id: `ColorBrew-RdYlGn-old` },
];

/**
 * Settings > Colors: pick the mood color scale.
 *
 * A tap on a different scale saves it to settings and tracks
 * `settings:scale_changed` once. Scale ids are persisted,
 * so they must stay in sync with the keys in `constants/Colors/Scales.ts`.
 */
export const ColorsScreen = () => {
  const { setSettings, settings } = useSettings();
  const colors = useColors();
  const analytics = useAnalytics();
  const paddingBottom = useScrollBottomPadding(20);

  const { scaleType } = settings;

  const onSelect = (id: SettingsState["scaleType"]) => {
    if (id === scaleType) {
      return;
    }
    setSettings((currentSettings) => ({ ...currentSettings, scaleType: id }));
    analytics.track("settings:scale_changed", { scale_type: id });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom }}
      >
        {typesNames.map((type) => (
          <Fragment key={type.id}>
            <Radio
              testID={`color-scale-${type.id}`}
              isSelected={type.id === scaleType}
              onPress={() => onSelect(type.id)}
            >
              <Scale type={type.id} />
            </Radio>
            {type.id === "ColorBrew-RdYlGn-old" && (
              <TextInfo
                style={{
                  marginTop: 0,
                }}
              >
                {t("colorblind_disclaimer")}
              </TextInfo>
            )}
          </Fragment>
        ))}
        <View
          style={{
            marginBottom: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        />
      </ScrollView>
    </View>
  );
};
