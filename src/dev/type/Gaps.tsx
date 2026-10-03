import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import {
  Case,
  Gap,
  GuidePage,
  Intro,
  Measured,
  RoleText,
  Spec,
} from "@/dev/type/chrome";
import { SPACE, TYPE } from "@/dev/type/scale";

const PARAGRAPH =
  "Notes and tags stay here too. You can export or delete them at any time.";

/** Current privacy-slide title gap, kept here so it can be compared. */
const CURRENT_TITLE_GAP = 20;

const Control = () => {
  const colors = useColors();

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.primaryButtonBackground,
        borderRadius: 12,
        paddingVertical: 16,
      }}
    >
      <Text
        style={{
          color: colors.primaryButtonText,
          fontSize: TYPE.body.fontSize,
          fontWeight: "600",
          lineHeight: TYPE.body.lineHeight,
        }}
      >
        Continue
      </Text>
    </View>
  );
};

const SectionPair = ({ gap }: { gap: number }) => (
  <Measured>
    <RoleText role={TYPE.section}>This week</RoleText>
    <Gap size={SPACE.afterTitle} />
    <RoleText role={TYPE.bodyReading}>{TYPE.bodyReading.sample}</RoleText>
    <Gap size={gap} />
    <RoleText role={TYPE.section}>Tags</RoleText>
    <Gap size={SPACE.afterTitle} />
    <RoleText role={TYPE.bodyReading}>Sleep, work, outside.</RoleText>
  </Measured>
);

/**
 * Vertical gaps between text blocks.
 * The band is the gap. The number in the gutter is its size in points.
 */
export const TypeGapsScreen = () => (
  <GuidePage>
    <Intro>
      The heading belongs to the block under it, so the space above a heading is
      the larger one. The band between lines is the gap itself.
    </Intro>
    <Case title="Title, then the first line">
      <Measured>
        <RoleText role={TYPE.title}>{TYPE.title.sample}</RoleText>
        <Gap size={SPACE.afterTitle} />
        <RoleText role={TYPE.bodyReading}>{TYPE.bodyReading.sample}</RoleText>
      </Measured>
    </Case>
    <Case title="Display, then the first line">
      <Measured>
        <RoleText role={TYPE.display}>{TYPE.display.sample}</RoleText>
        <Gap size={SPACE.afterDisplay} />
        <RoleText role={TYPE.bodyReading}>{TYPE.bodyReading.sample}</RoleText>
      </Measured>
    </Case>
    <Case title="Paragraphs">
      <Measured>
        <RoleText role={TYPE.bodyReading}>{TYPE.bodyReading.sample}</RoleText>
        <Gap size={SPACE.afterTitle} />
        <RoleText role={TYPE.bodyReading}>{PARAGRAPH}</RoleText>
      </Measured>
    </Case>
    <Case title="Sections">
      <SectionPair gap={SPACE.section} />
      <Spec>24 between related sections. 12 under each heading.</Spec>
      <View style={{ height: 20 }} />
      <SectionPair gap={SPACE.sectionLoose} />
      <Spec>32 when the sections are unrelated.</Spec>
    </Case>
    <Case title="Caption under a control">
      <Measured>
        <Control />
        <Gap size={SPACE.list} />
        <RoleText role={TYPE.caption}>{TYPE.caption.sample}</RoleText>
      </Measured>
    </Case>
    <Case title="Title gap, 12 and 20">
      <Measured>
        <RoleText role={TYPE.title}>Your data stays here</RoleText>
        <Gap size={SPACE.afterTitle} />
        <RoleText role={TYPE.bodyReading}>{TYPE.bodyReading.sample}</RoleText>
      </Measured>
      <View style={{ height: 20 }} />
      <Measured>
        <RoleText role={TYPE.title}>Your data stays here</RoleText>
        <Gap size={CURRENT_TITLE_GAP} />
        <RoleText role={TYPE.bodyReading}>{TYPE.bodyReading.sample}</RoleText>
      </Measured>
      <Spec>Top is the guide. Bottom matches the privacy title today.</Spec>
    </Case>
  </GuidePage>
);
