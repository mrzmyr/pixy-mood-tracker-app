import { LinearGradient } from "expo-linear-gradient"
import { Pressable, Text, View } from "react-native"
import { ChevronRight, Moon, X } from "react-native-feather"
import useColors from "@/hooks/useColors"
import { Motion } from "@legendapp/motion"
import { t } from "@/helpers/translation"
import useHaptics from "@/hooks/useHaptics"
import { useSettings } from "@/hooks/useSettings"

export const MONTH_REPORT_SLUG = `promo_month_report_${(new Date()).getFullYear()}_${(new Date()).getMonth()}_closed`

export const PromoCardMonth = ({
  title,
  onPress,
}: {
  title: string
  onPress: () => void
}) => {
  const colors = useColors()
  const haptics = useHaptics()
  const { addActionDone, hasActionDone } = useSettings()

  const gradientColors = [
    colors.palette.indigo[900],
    colors.palette.indigo[600],
    colors.palette.indigo[500]
  ]

  const _onPress = () => {
    haptics.selection()
    onPress()
  }

  const onClose = () => {
    haptics.selection()
    addActionDone(MONTH_REPORT_SLUG)
  }

  if (hasActionDone(MONTH_REPORT_SLUG)) return null

  return (
    <Motion.View
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 140, opacity: 1 }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 400,
      }}
      style={{
        overflow: "hidden",
      }}
    >
      <Pressable
        style={({ pressed }) => [{
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          overflow: 'hidden',
          paddingVertical: 24,
          paddingHorizontal: 16,
          opacity: pressed ? 0.8 : 1,
          minHeight: 140,
        }]}
        onPress={_onPress}
      >
        <LinearGradient
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
          colors={gradientColors}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 16,
            top: -100,
          }}
        >
          <Moon width={400} height={400} fill={gradientColors[0]} color={gradientColors[0]} />
        </View>
        <View
          style={{
            position: 'absolute',
            left: 16,
            top: 16,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.palette.white,
            }}
          >{t('month_report')}</Text>
        </View>
        <Pressable
          style={{
            padding: 4,
            borderRadius: 100,
            width: 32,
            position: 'absolute',
            right: 12,
            top: 12,
          }}
          onPress={onClose}
        >
          <X stroke={colors.promoCardText} width={24} height={24} />
        </Pressable>
        <View
          style={{
            flexDirection: 'column',
            width: '55%',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.palette.white,
              marginTop: 8,
              lineHeight: 26,
            }}
          >
            {title}
          </Text>
        </View>
      </Pressable>
    </Motion.View>
  )
}