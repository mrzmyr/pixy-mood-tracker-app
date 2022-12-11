import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { Emotion } from "@/types";
import { Motion } from "@legendapp/motion";
import { Pressable, Text, View } from "react-native";
import { X } from "react-native-feather";

export const Tooltip = ({
  emotion,
  onClose,
}: {
  emotion: Emotion;
  onClose: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <Motion.View
      style={{
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 12,
        paddingHorizontal: 16,
        position: 'absolute',
        bottom: 0,
        backgroundColor: colors.tooltipBackground,
        zIndex: 1,
        right: 16,
        left: 16,
        borderRadius: 12,
      }}
      initial={{
        opacity: 0,
        translateY: 100,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
      }}
    >
      {emotion && (
        <>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Text
              style={{
                color: colors.tooltipTextSecondary,
                fontSize: 17,
                marginBottom: 2,
              }}
            >
              {emotion.label}
            </Text>
            <Pressable
              style={{
                padding: 8,
                marginTop: -8,
                marginRight: -8,
                marginBottom: -8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                haptics.selection();
                onClose()
              }}
            >
              <X color={colors.tooltipTextSecondary} width={24} height={24} />
            </Pressable>
          </View>
          <Text
            style={{
              color: colors.tooltipText,
              fontSize: 17,
              lineHeight: 24,
            }}
          >
            {emotion.description}
          </Text>
        </>
      )}
    </Motion.View>
  );
};
