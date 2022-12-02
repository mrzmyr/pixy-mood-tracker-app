import { TouchableOpacity } from "react-native"
import useColors from "@/hooks/useColors"

export const FloatButton = ({
  onPress,
  disabled,
  children,
}: {
  onPress: () => void
  disabled?: boolean
  children?: React.ReactNode
}) => {
  const colors = useColors()

  return (
    <TouchableOpacity
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