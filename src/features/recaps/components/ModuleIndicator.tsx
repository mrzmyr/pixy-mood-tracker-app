import { Fragment } from "react";
import { Text } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import type { IColors } from "@/constants/Colors";
import type { CardFamily, RecapModule } from "../types";

const MODULES: Record<
  RecapModule,
  { label: TranslationKey; color: Extract<keyof IColors, `module${string}`> }
> = {
  mood: { label: "logger_step_rating", color: "moduleMood" },
  emotions: { label: "logger_step_emotions", color: "moduleEmotions" },
  people: { label: "logger_step_people", color: "modulePeople" },
  location: { label: "location_setting", color: "moduleLocation" },
  tags: { label: "logger_step_tags", color: "moduleTags" },
  sleep: { label: "logger_step_sleep", color: "moduleSleep" },
  photos: { label: "logger_step_photos", color: "modulePhotos" },
};

const FAMILIES: Record<CardFamily, TranslationKey> = {
  moment: "recaps_family_moment",
  summary: "recaps_family_summary",
  pattern: "recaps_family_pattern",
  change: "recaps_family_change",
  nudge: "recaps_family_nudge",
};

/** "PEOPLE × MOOD · PATTERN": module names in their color, then the family. */
export const ModuleIndicator = ({
  modules,
  family,
}: {
  modules: RecapModule[];
  family: CardFamily;
}) => {
  const colors = useColors();

  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color: colors.textSecondary,
      }}
    >
      {modules.map((module, index) => (
        <Fragment key={module}>
          {index > 0 && " × "}
          <Text style={{ color: colors[MODULES[module].color] }}>
            {t(MODULES[module].label)}
          </Text>
        </Fragment>
      ))}
      {` · ${t(FAMILIES[family])}`}
    </Text>
  );
};
