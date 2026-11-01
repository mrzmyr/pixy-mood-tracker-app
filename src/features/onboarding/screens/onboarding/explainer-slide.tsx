import { View } from "react-native";
import Button from "@/components/button";
import useColors from "@/hooks/use-colors";
import { TextReveal } from "@/components/text-reveal";
import { getTextRevealDuration } from "@/components/text-reveal-parts";
import { SLIDE_TEXT_DELAY_MS } from "./slide-timing";
import { HeaderImage } from "./header-image";
import { HeaderNavigation } from "./header-navigation";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { t, tDynamic } from "@/lib/translation";

const Body = ({ index }: { index: number }) => {
  const colors = useColors();
  const title = tDynamic(`onboarding_step_${index}_title`);

  return (
    <View
      style={{
        paddingVertical: 32,
        paddingHorizontal: 32,
      }}
    >
      <TextReveal
        accessibilityRole="header"
        delay={SLIDE_TEXT_DELAY_MS}
        containerStyle={{ marginBottom: 8 }}
        style={{
          color: colors.onboardingTitle,
          fontSize: 20,
          fontWeight: "bold",
        }}
      >
        {title}
      </TextReveal>
      <TextReveal
        delay={SLIDE_TEXT_DELAY_MS + getTextRevealDuration(title) * 0.5}
        style={{
          color: colors.onboardingBody,
          fontSize: 17,
          lineHeight: 24,
        }}
      >
        {tDynamic(`onboarding_step_${index}_body`)}
      </TextReveal>
    </View>
  );
};

/**
 * Onboarding feature slide. `index` selects the header image and the
 * `onboarding_step_<index>_*` translation keys, so it must be 1 to 4.
 */
export const ExplainerSlide = ({
  index,
  setIndex,
  onSkip,
}: {
  index: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
}) => (
  <>
    <View
      style={{
        width: "100%",
        justifyContent: "flex-end",
        alignItems: "center",
        flex: 1,
      }}
    >
      <View
        style={{
          width: "100%",
          alignItems: "center",
          flex: 1,
        }}
      >
        <HeaderImage
          index={index}
          style={
            index === 3
              ? {
                  width: "90%",
                  maxWidth: 340,
                  flex: 1,
                }
              : {
                  width: "90%",
                  flex: 1,
                }
          }
        />
      </View>
    </View>
    <View
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
        }}
      >
        <HeaderNavigation onSkip={onSkip} index={index} setIndex={setIndex} />
        <Body index={index} />
        {/* Reaches into the empty padding of the text and the button. */}
        <SkyFlightZone style={{ flex: 1, marginVertical: -24 }} />
      </View>
      <View
        style={{
          padding: 32,
        }}
      >
        <Button onPress={() => setIndex(index + 1)}>
          {t("onboarding_next")}
        </Button>
      </View>
    </View>
  </>
);
