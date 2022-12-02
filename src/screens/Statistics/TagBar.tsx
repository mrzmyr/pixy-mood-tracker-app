import { Text, View } from "react-native";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import useColors from "../../hooks/useColors";

export const TagBar = ({
  children,
  width,
  colorName = 'red',
  muted,
  size,
  label
}: {
  children: any;
  width: string;
  muted?: boolean;
  colorName?: typeof TAG_COLOR_NAMES[number];
  size: 'small' | 'large';
  label: string;
}) => {
  const colors = useColors();

  const textColor = muted ? colors.statisticsTagsTrendMutedText : colors.tags[colorName]?.text;
  const backgroundColor = muted ? colors.statisticsTagsTrendMutedBackground : colors.tags[colorName]?.background;

  const height = size === 'small' ? 24 : 32;

  return (
    <View
      style={{
        position: 'relative',
        height,
        justifyContent: 'center',
        paddingLeft: 8,
      }}
    >
      <View
        style={{
          backgroundColor: backgroundColor,
          height,
          width,
          borderRadius: 4,
          position: 'absolute',
        }}
      />
      <Text
        style={{
          marginTop: 4,
          fontSize: 14,
          color: colors.textSecondary,
          position: 'absolute',
          right: 8,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: textColor,
          fontSize: 14,
          fontWeight: '600',
        }}
      >{children}</Text>
    </View>
  )
}