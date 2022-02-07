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
      maxWidth: '25%',
    }}>
      {left}
    </View>
    <View style={{
      justifyContent: 'center',
      flexDirection: 'row',
      maxWidth: '50%',
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
      maxWidth: '25%',
    }}>
      {right}
    </View>
  </View>
  )
}
