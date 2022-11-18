import { useKeyboard } from "@react-native-community/hooks"
import { useEffect, useState } from "react"
import { Keyboard, View } from "react-native"
import { ArrowRight, Check } from "react-native-feather"
import useColors from "../../hooks/useColors"
import useHaptics from "../../hooks/useHaptics"
import { FloatButton } from "../../components/FloatButton"

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

  const [shouldMove, setShouldMove] = useState(false)

  useEffect(() => {
    const r1 = Keyboard.addListener('keyboardWillShow', () => setShouldMove(true))
    const r2 = Keyboard.addListener('keyboardWillHide', () => setShouldMove(false))

    return () => {
      r1.remove()
      r2.remove()
    }
  }, [])

  if (type === 'hidden') return null

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        paddingBottom: 32,
        paddingRight: 32,
        position: 'absolute',
        bottom: shouldMove ? keyboard.keyboardHeight : 0,
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