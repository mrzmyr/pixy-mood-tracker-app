import useColors from "@/hooks/useColors"
import useHaptics from "@/hooks/useHaptics"
import { useSettings } from "@/hooks/useSettings"
import { Pressable, Text, View } from "react-native"
import { X } from "react-native-feather"
import Indicator from "./Indicator"

export const PromoCard = ({
  subtitle,
  title,
  onPress,
  slug,
  colorName,
}: {
  subtitle: string
  title: string
  onPress: () => void
  slug: string
  colorName?: string
}) => {
  const colors = useColors()
  const haptics = useHaptics()
  const { addActionDone, hasActionDone } = useSettings()

  const _onPress = () => {
    haptics.selection()
    onPress()
  }

  const onClose = () => {
    haptics.selection()
    addActionDone(slug)
  }

  if (hasActionDone(slug)) return null

  return (
    <Pressable
      style={({ pressed }) => [{
        backgroundColor: colors.promoCardBackground,
        borderRadius: 12,
        overflow: 'hidden',
        paddingVertical: 16,
        paddingHorizontal: 16,
        opacity: pressed ? 0.8 : 1,
        minHeight: 140,
        borderColor: colors.promoCardBorder,
        borderWidth: 1,
      }]}
      onPress={_onPress}
    >
      <Indicator
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
        }}
        colorName={colorName || 'purple'}
      >
        {subtitle}
      </Indicator>
      <Pressable
        style={{
          position: 'absolute',
          height: 48,
          width: 48,
          right: 4,
          top: 4,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1,
        }}
        onPress={onClose}
      >
        <X stroke={colors.promoCardText} width={24} height={24} />
      </Pressable>
      <View
        style={{
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.promoCardText,
            marginTop: 8,
            lineHeight: 26,
          }}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  )
}