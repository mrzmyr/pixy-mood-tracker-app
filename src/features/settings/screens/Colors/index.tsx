import {
  Fragment,
  useCallback,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { ScrollView, View } from "react-native";
import TextInfo from "@/components/TextInfo";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { useSettings } from "@/state/settings";
import { Radio } from "./Radio";
import { Scale } from "./Scale";

const SCALE_IDS = [
  "ColorBrew-RdYlGn",
  "ColorBrew-RdYG",
  "ColorBrew-RdYlGn-old",
];

/**
 * Settings > Colors: pick the mood color scale.
 *
 * A selection is saved to settings immediately. Scale ids are persisted,
 * so they must stay in sync with the keys in `constants/Colors/Scales.ts`.
 */
export const ColorsScreen = () => {
  const { setSettings, settings } = useSettings();
  const colors = useColors();
  const analytics = useAnalytics();

  const [scaleType, setScaleType] = useState(settings.scaleType);

  // Effect event: tracks with the latest analytics instance without re-running
  // the effect when analytics changes.
  const trackScaleChange = useEffectEvent(
    (changedScaleType: typeof scaleType) => {
      analytics.track("settings:scale_changed", {
        scale_type: changedScaleType,
      });
    }
  );

  useEffect(() => {
    setSettings((currentSettings) => ({ ...currentSettings, scaleType }));
    trackScaleChange(scaleType);
  }, [scaleType, setSettings]);

  const onSelect = useCallback((id) => {
    setScaleType(id);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{
          padding: 20,
        }}
      >
        {SCALE_IDS.map((id) => (
          <Fragment key={id}>
            <Radio isSelected={id === scaleType} onPress={() => onSelect(id)}>
              <Scale type={id} />
            </Radio>
            {id === "ColorBrew-RdYlGn-old" && (
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
      </ScrollView>
    </View>
  );
};
