import { Text, View } from "react-native"
import useColors from "../../hooks/useColors"

export const FactSheet = ({
  title,
  body,
  color = {}
}) => {
  const colors = useColors()
  
  return (
    <View style={{
      flex: 1,
      padding: 12,
      paddingLeft: 16,
      paddingRight: 16,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      marginBottom: 16,
      marginTop: 8,
      margin: 4,
    }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text 
          ellipsizeMode='tail'
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: 'bold',
            color: colors.textSecondary,
          }}
        >
          {title}
        </Text>
      </View>
      { typeof(body) === 'string' ? (
        <Text style={{
          fontSize: 21,
          fontWeight: 'bold',
          color: colors.text
        }}>{body}</Text>
      ) : (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {body}
        </View>
      )}
    </View>
  )
}
