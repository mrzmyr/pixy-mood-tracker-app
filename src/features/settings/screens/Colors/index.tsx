import { useEffect, useEffectEvent, useState } from "react";
import { View } from "react-native";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { useSettings } from "@/state/settings";
import { ScaleList } from "./ScaleList";

const SCALE_IDS = [
  "ColorBrew-RdYlGn",
  "ColorBrew-RdYG",
  "ColorBrew-RdYlGn-old",
] as const;

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

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScaleList
        scaleIds={SCALE_IDS}
        selectedId={scaleType}
        onSelect={setScaleType}
        footer={t("colorblind_disclaimer")}
      />
    </View>
  );
};
