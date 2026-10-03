import { View } from "react-native";
import useColors from "@/hooks/useColors";
import { BulletList } from "@/dev/type/BulletList";
import { Case, GuidePage, Intro, Measured, Spec } from "@/dev/type/chrome";
import { SPACE } from "@/dev/type/scale";

const SHORT = ["On this device", "No account", "Export any time"] as const;

const WRAPPING = [
  "Entries, notes, and tags stay on this device.",
  "You can export a copy or delete everything from Settings.",
  "Analytics is optional and never includes note text.",
] as const;

/**
 * Bullet lists: tight for one line, looser once a line wraps, plus one nested level.
 */
export const TypeListsScreen = () => {
  const colors = useColors();

  return (
    <GuidePage>
      <Intro>
        A 6-point dot sits 12 points from the text, centered on the first line.
        The gap between items stays smaller than the gap between paragraphs.
      </Intro>
      <Case title="One line · 4">
        <Measured>
          <BulletList items={SHORT} gap={SPACE.listTight} measured />
        </Measured>
        <Spec>Dot offset is (24 − 6) / 2 = 9, so it centers on the line.</Spec>
      </Case>
      <Case title="Wrapping · 8">
        <Measured>
          <BulletList items={WRAPPING} gap={SPACE.list} measured />
        </Measured>
      </Case>
      <Case title="Nested · extra 16">
        <BulletList items={["On this device"]} gap={0} />
        <View style={{ flexDirection: "row", marginTop: SPACE.listTight }}>
          <View
            style={{
              backgroundColor: colors.logHeaderHighlight,
              width: SPACE.nested,
            }}
          />
          <View style={{ flex: 1 }}>
            <BulletList items={["Notes", "Tags"]} gap={SPACE.listTight} />
          </View>
        </View>
        <Spec>The bar is the extra 16 points of indent.</Spec>
      </Case>
    </GuidePage>
  );
};
