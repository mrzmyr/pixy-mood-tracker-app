import { ScrollView } from "react-native";
import TextInfo from "@/components/TextInfo";
import { Radio } from "./Radio";
import { Scale } from "./Scale";
import { scaleLabel } from "./scaleLabel";
import type { ScaleListProps } from "./types";

/**
 * Scale choice on web: React Native radio cards. iOS and Android use native
 * grouped rows (`ScaleList.ios.tsx`, `ScaleList.android.tsx`).
 */
export const ScaleList = ({
  scaleIds,
  selectedId,
  onSelect,
  footer,
}: ScaleListProps) => (
  <ScrollView contentContainerStyle={{ padding: 20 }}>
    {scaleIds.map((id, index) => (
      <Radio
        key={id}
        label={scaleLabel(index, scaleIds.length)}
        isSelected={id === selectedId}
        onPress={() => onSelect(id)}
      >
        <Scale type={id} />
      </Radio>
    ))}
    <TextInfo style={{ marginTop: 0 }}>{footer}</TextInfo>
  </ScrollView>
);
