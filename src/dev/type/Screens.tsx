import { View } from "react-native";
import useColors from "@/hooks/useColors";
import { BulletList } from "@/dev/type/BulletList";
import { Case, GuidePage, Intro, RoleText, Spec } from "@/dev/type/chrome";
import { SPACE, TYPE } from "@/dev/type/scale";

const NOTES = [
  "Entries, notes, and tags stay on this device.",
  "You can export a copy or delete everything from Settings.",
] as const;

/**
 * Horizontal padding as a tinted bar on each side.
 * The text column is the content area.
 */
const Frame = ({
  padding,
  children,
}: {
  padding: number;
  children: React.ReactNode;
}) => {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row" }}>
      <View
        style={{ backgroundColor: colors.logHeaderHighlight, width: padding }}
      />
      <View style={{ flex: 1 }}>{children}</View>
      <View
        style={{ backgroundColor: colors.logHeaderHighlight, width: padding }}
      />
    </View>
  );
};

/**
 * The same rules composed: a content screen at 16, and an onboarding slide at 32.
 */
export const TypeScreensScreen = () => (
  <GuidePage>
    <Intro>
      The bars on each side are the horizontal padding. Gaps inside the column
      are the ones from Gaps and Lists, without the measuring bands.
    </Intro>
    <Case title="Content · 16">
      <Frame padding={SPACE.screen}>
        <RoleText role={TYPE.section}>This week</RoleText>
        <View style={{ height: SPACE.afterTitle }} />
        <RoleText role={TYPE.bodyReading}>{TYPE.bodyReading.sample}</RoleText>
        <View style={{ height: SPACE.afterTitle }} />
        <RoleText role={TYPE.bodyReading}>
          Notes and tags stay here too. You can export or delete them at any
          time.
        </RoleText>
        <View style={{ height: SPACE.section }} />
        <RoleText role={TYPE.section}>Tags</RoleText>
        <View style={{ height: SPACE.afterTitle }} />
        <BulletList items={NOTES} gap={SPACE.list} />
      </Frame>
      <Spec>
        16 horizontal. 12 under a heading and between paragraphs. 24 between
        sections. 8 between wrapping items.
      </Spec>
    </Case>
    <Case title="Onboarding · 32">
      <Frame padding={SPACE.onboarding}>
        <RoleText role={TYPE.display}>Privacy</RoleText>
        <View style={{ height: SPACE.afterDisplay }} />
        <BulletList items={NOTES} gap={SPACE.list} />
        <View style={{ height: SPACE.afterDisplay }} />
        <RoleText role={TYPE.caption}>{TYPE.caption.sample}</RoleText>
      </Frame>
      <Spec>
        32 horizontal. 16 under the display headline. 8 between wrapping items.
      </Spec>
    </Case>
  </GuidePage>
);
