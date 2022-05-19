import { Text, View } from "react-native"
import useColors from "../../hooks/useColors"

export const ListEntry = ({
  index,
  title,
  count,
  isLast = false,
}) => {
  const colors = useColors()

  return (
    <View
      style={{
        flexDirection: 'row',
        marginBottom: isLast ? 0 : 8,
        borderBottomColor: colors.menuListItemBorder,
        borderBottomWidth: isLast ? 0 : 1,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      <View
        style={{
          flex: 0.5,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 17,
            color: colors.textSecondary,
          }}
        >{`${index+1}`}</Text>
      </View>
      <View
        style={{
          flex: 3,
          justifyContent: 'center',
          paddingLeft: 8,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            color: colors.text,
          }}
        >{`${title}`}</Text>
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 15,
            color: colors.textSecondary,
          }}
        >{`${count}`}</Text>
      </View>
    </View>
  )
}
