import { Text, View, ViewStyle } from "react-native"
import useColors from "@/hooks/useColors"

export default function ModalHeader({
  title = '',
  right = null,
  left = null,
  style = {},
}: {
  title?: string,
  right?: React.ReactNode,
  left?: React.ReactNode,
  style?: ViewStyle,
}) {
  const colors = useColors()

  return (
    <View
      style={[{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        paddingLeft: 8,
        paddingRight: 8,
        paddingBottom: 8,
        backgroundColor: colors.logHeaderBackground,
        borderBottomColor: colors.logHeaderBorder,
        borderBottomWidth: 1,
      }, style]}
    >
      <View style={{
        justifyContent: 'flex-start',
        flexDirection: 'row',
        width: '30%',
      }}>
        {left ? left : null}
      </View>
      <View style={{
        justifyContent: 'center',
        flexDirection: 'row',
        width: '40%',
      }}>
        <Text
          numberOfLines={1}
          ellipsizeMode='middle'
          style={{
            fontSize: 17,
            color: colors.text,
            fontWeight: '600',
            width: '100%',
            textAlign: 'center',
          }}
        >{title}</Text>
      </View>
      <View style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexDirection: 'row',
        width: '30%',
      }}>
        {right}
      </View>
    </View>
  )
}
