import { useKeyboard } from "@react-native-community/hooks"
import { useEffect, useState } from "react"
import { Keyboard, Platform, View } from "react-native"
import { ArrowRight, Check } from "react-native-feather"
import useColors from "@/hooks/useColors"
import useHaptics from "@/hooks/useHaptics"
import { FloatButton } from "../../FloatButton"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const ON_EVENT_NAME = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
const OFF_EVENT_NAME = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

export const SlideAction = ({
  type,
  disabled,
  onPress,
}: {
  type: 'next' | 'save' | 'hidden'
  disabled?: boolean
  onPress?: () => void
}) => {
  const haptics = useHaptics()
  const colors = useColors()
  const keyboard = useKeyboard()
  const insets = useSafeAreaInsets()

  const [shouldMove, setShouldMove] = useState(false)

  useEffect(() => {
    const r1 = Keyboard.addListener(ON_EVENT_NAME, () => setShouldMove(true))
    const r2 = Keyboard.addListener(OFF_EVENT_NAME, () => setShouldMove(false))

    return () => {
      r1.remove()
      r2.remove()
    }
  }, [])

  if (type === 'hidden') return null

  const bottom = Math.round(keyboard.keyboardHeight) - (Platform.OS === 'ios' ? 20 : 0);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        paddingBottom: insets.bottom + 16,
        paddingRight: 32,
        position: 'absolute',
        bottom: shouldMove ? bottom : 0,
        right: 0,
        zIndex: 999,
      }}
    >
      <FloatButton
        onPress={async () => {
          if (disabled) return
          await haptics.selection()
          onPress?.()
        }}
        disabled={disabled}
      >
        {type === 'save' && (
          <Check color={disabled ? colors.primaryButtonTextDisabled : colors.primaryButtonText} width={24} />
        )}
        {type === 'next' && (
          <ArrowRight color={disabled ? colors.primaryButtonTextDisabled : colors.primaryButtonText} width={24} />
        )}
      </FloatButton>
    </View>
  )
}