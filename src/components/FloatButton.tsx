import { TouchableOpacity } from "react-native"
import useColors from "@/hooks/useColors"

export const FloatButton = ({
  onPress,
  disabled,
  children,
  testID,
}: {
  onPress: () => void
  disabled?: boolean
  children?: React.ReactNode
  testID?: string
}) => {
  const colors = useColors()

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        width: 54,
        height: 54,
        borderRadius: 100,
        backgroundColor: disabled ? colors.primaryButtonBackgroundDisabled : colors.primaryButtonBackground,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {children}
    </TouchableOpacity>
  )
}