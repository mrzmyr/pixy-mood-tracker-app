import { useKeyboard } from "@react-native-community/hooks"
import { useEffect, useState } from "react"
import { Keyboard } from "react-native"
import { View } from "react-native-animatable"
import { ArrowRight, Check } from "react-native-feather"
import useColors from "../../hooks/useColors"
import useHaptics from "../../hooks/useHaptics"
import { FloatButton } from "./FloatButton"

export const SlideAction = ({
  slideIndex,
  slides,
  next,
  save,
}: {
  slideIndex: number,
  slides: any[],
  next: () => void,
  save: () => void,
}) => {
  const haptics = useHaptics()
  const colors = useColors()
  const keyboard = useKeyboard()

  const [shouldMove, setShouldMove] = useState(false)
  
  useEffect(() => {
    const r1 = Keyboard.addListener('keyboardDidShow', () => setShouldMove(true))
    const r2 = Keyboard.addListener('keyboardWillHide', () => setShouldMove(false))

    return () => {
      r1.remove()
      r2.remove()
    }
  }, [])

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
          await haptics.selection()
          if(slideIndex === slides.length - 1) {
            save()
          } else {
            next()
          }
        }}
      >
        {slideIndex === slides.length - 1 ? (
          <Check color={colors.primaryButtonText} width={24} />
        ) : (
          <ArrowRight color={colors.primaryButtonText} width={24} />
        )}
      </FloatButton>
    </View>
  )
}