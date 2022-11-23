import { LinearGradient } from "expo-linear-gradient"
import { Pressable, Text, View } from "react-native"
import { ChevronRight, Moon, Star } from "react-native-feather"
import useColors from "../hooks/useColors"
import { Motion } from "@legendapp/motion"
import { t } from "../helpers/translation"
import useHaptics from "../hooks/useHaptics"

export const PromoCardYear = ({
  title,
  onPress,
}: {
  title: string
  onPress: () => void
}) => {
  const colors = useColors()
  const haptics = useHaptics()

  const gradientColors = [
    colors.palette.orange[700],
    colors.palette.orange[500],
    colors.palette.yellow[400]
  ]

  const _onPress = () => {
    haptics.selection()
    onPress()
  }

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
          borderRadius: 8,
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
            left: 0,
            top: -50,
            transform: [{ rotate: '-20deg' }],
          }}
        >
          <Star width={500} height={500} fill={gradientColors[0]} color={gradientColors[0]} />
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
          >{t('year_report')}</Text>
        </View>
        <View
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: 4,
            borderRadius: 100,
            width: 32,
            position: 'absolute',
            right: 16,
            top: 16,
          }}
        >
          <ChevronRight stroke={colors.palette.white} width={24} height={24} />
        </View>
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