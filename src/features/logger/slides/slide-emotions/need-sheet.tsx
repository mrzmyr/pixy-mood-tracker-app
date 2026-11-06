import chunk from "lodash/chunk";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { HeaderButton } from "@/components/header-button";
import LinkButton from "@/components/link-button";
import ModalHeader from "@/components/modal-header";
import { SheetModal } from "@/components/sheet-modal";
import { Copy, Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import { EmotionButtonBasic } from "./emotion-button-basic";
import { NeedRating } from "./need-rating";
import { feelingsForNeed, previewFeelings } from "./needs";
import type { NeedConfig, NeedState } from "./needs";

const CELL_GAP = 8;
const CELL_STYLE = { flex: 1 };

/** Two-column feelings grid, in the look of the basic emotion grid. */
const FeelingsGrid = ({
  emotions,
  selectedEmotions,
  onPress,
  testID,
}: {
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPress: (emotion: Emotion) => void;
  testID: string;
}) => {
  const isSelected = (emotion: Emotion) =>
    selectedEmotions.some((d) => d.key === emotion.key);

  return (
    <View style={{ gap: CELL_GAP }} testID={testID}>
      {chunk(emotions, 2).map((row) => (
        <View
          key={`row-${row[0].key}`}
          style={{ flexDirection: "row", gap: CELL_GAP }}
        >
          {row.map((emotion) => (
            <View key={emotion.key} style={CELL_STYLE}>
              <EmotionButtonBasic
                emotion={emotion}
                onPress={onPress}
                selected={isSelected(emotion)}
              />
            </View>
          ))}
          {row.length === 1 && <View style={CELL_STYLE} />}
        </View>
      ))}
    </View>
  );
};

/**
 * Content of the need sheet: meaning, labeled rating, and the feelings of
 * the rating. Shows the 8 strongest feelings, or 4 per side when partly met;
 * More shows the rest. Partly met splits feelings into what helped and what
 * was missing.
 */
const NeedSheetContent = ({
  need,
  state,
  onChange,
  emotions,
  selectedEmotions,
  onPressEmotion,
  onClose,
}: {
  need: NeedConfig;
  state?: NeedState;
  onChange: (state: NeedState | undefined) => void;
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPressEmotion: (emotion: Emotion) => void;
  onClose: () => void;
}) => {
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(false);
  const all = state ? feelingsForNeed(need, state, emotions) : undefined;
  const shown = all && !isExpanded ? previewFeelings(all) : all;
  const hiddenCount =
    all && shown
      ? all.met.length +
        all.unmet.length -
        shown.met.length -
        shown.unmet.length
      : 0;
  const isPartly = state === "partly";

  const section = (
    list: Emotion[],
    title: string | undefined,
    testID: string
  ) =>
    list.length > 0 && (
      <View style={{ gap: 8 }}>
        {title && (
          <Label size={14} strong style={{ color: colors.textSecondary }}>
            {title}
          </Label>
        )}
        <FeelingsGrid
          emotions={list}
          selectedEmotions={selectedEmotions}
          onPress={onPressEmotion}
          testID={testID}
        />
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <ModalHeader
        title={t(need.label)}
        right={
          <HeaderButton
            kind="confirm"
            label={t("done")}
            onPress={onClose}
            testID="needs-sheet-done"
          />
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 20 }}
      >
        <View style={{ gap: 12 }}>
          <Copy size={14} style={{ color: colors.textSecondary }}>
            {t(need.description)}
          </Copy>
          <NeedRating
            label={t(need.label)}
            state={state}
            onChange={(next) => {
              setIsExpanded(false);
              onChange(next);
            }}
            isLabeled
            testID="needs-sheet-rating"
          />
        </View>
        {shown ? (
          <View style={{ gap: 16 }}>
            {section(
              shown.met,
              isPartly ? t("log_needs_helped") : undefined,
              "needs-sheet-met"
            )}
            {section(
              shown.unmet,
              isPartly ? t("log_needs_missing") : undefined,
              "needs-sheet-unmet"
            )}
            {(hiddenCount > 0 || isExpanded) && (
              <LinkButton
                testID="needs-sheet-more"
                onPress={() => setIsExpanded((current) => !current)}
                style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
              >
                {t(isExpanded ? "less" : "more")}
              </LinkButton>
            )}
          </View>
        ) : (
          <Copy size={14} style={{ color: colors.textSecondary }}>
            {t("log_needs_rate_hint")}
          </Copy>
        )}
      </ScrollView>
    </View>
  );
};

/**
 * Sheet of one need, opened from its tile on the needs board. Keeps the last
 * need while it slides out. Done and swipe-down close it; ratings and picks
 * apply right away.
 */
export const NeedSheet = ({
  need,
  visible,
  ...props
}: {
  need?: NeedConfig;
  visible: boolean;
  state?: NeedState;
  onChange: (state: NeedState | undefined) => void;
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPressEmotion: (emotion: Emotion) => void;
  onClose: () => void;
}) => {
  const colors = useColors();

  return (
    <SheetModal
      visible={visible}
      onClose={props.onClose}
      backgroundColor={colors.logBackground}
    >
      {need && <NeedSheetContent key={need.key} need={need} {...props} />}
    </SheetModal>
  );
};
