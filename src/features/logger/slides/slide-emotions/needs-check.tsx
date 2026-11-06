import chunk from "lodash/chunk";
import { useState } from "react";
import { View } from "react-native";
import type { Emotion } from "@/types";
import { NeedSheet } from "./need-sheet";
import { NeedTile } from "./need-tile";
import { NEEDS, pickedForNeed } from "./needs";
import type { NeedKey, NeedState, NeedStates } from "./needs";

const GAP = 10;

/**
 * Needs mode of the emotions step: a board of six need tiles in two columns.
 * Each tile shows its rating and picked feelings. Tap opens the need sheet
 * to rate the need and pick from its feelings.
 */
export const NeedsCheck = ({
  states,
  onChange,
  emotions,
  selectedEmotions,
  onPressEmotion,
}: {
  states: NeedStates;
  /** `undefined` clears the rating. */
  onChange: (key: NeedKey, state: NeedState | undefined) => void;
  /** All emotions. Feelings come from this list. */
  emotions: Emotion[];
  selectedEmotions: Emotion[];
  onPressEmotion: (emotion: Emotion) => void;
}) => {
  const [openKey, setOpenKey] = useState<NeedKey>();
  // Keeps the sheet content while it slides out.
  const [lastKey, setLastKey] = useState<NeedKey>();
  const sheetNeed = NEEDS.find((need) => need.key === (openKey ?? lastKey));

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        // Last row clears the 32 pt bottom fade of the list.
        paddingBottom: 40,
        gap: GAP,
      }}
    >
      {chunk(NEEDS, 2).map((row) => (
        <View key={row[0].key} style={{ flexDirection: "row", gap: GAP }}>
          {row.map((need) => (
            <NeedTile
              key={need.key}
              need={need}
              state={states[need.key]}
              picked={pickedForNeed(need, states[need.key], selectedEmotions)}
              onPress={() => {
                setOpenKey(need.key);
                setLastKey(need.key);
              }}
            />
          ))}
        </View>
      ))}
      <NeedSheet
        need={sheetNeed}
        visible={openKey !== undefined}
        state={sheetNeed ? states[sheetNeed.key] : undefined}
        onChange={(state) => sheetNeed && onChange(sheetNeed.key, state)}
        emotions={emotions}
        selectedEmotions={selectedEmotions}
        onPressEmotion={onPressEmotion}
        onClose={() => setOpenKey(undefined)}
      />
    </View>
  );
};
