import { Text, View } from "react-native"
import useColors from "../hooks/useColors"

export default function ModalHeader({
  title = '',
  right = null,
  left = null,
}: {
  title?: string,
  right?: React.ReactNode,
  left?: React.ReactNode,
}) {
  const colors = useColors()
  
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}
    >
    <View style={{
      justifyContent: 'flex-start',
      flexDirection: 'row',
    }}>
      {left}
    </View>
    <View style={{
      justifyContent: 'flex-start',
      flexDirection: 'row',
    }}>
      <Text
        style={{
          fontSize: 17,
          color: colors.text,
          fontWeight: '600',
        }}
      >{title}</Text>
    </View>
    <View style={{
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexDirection: 'row',
    }}>
      {right}
    </View>
  </View>
  )
}
