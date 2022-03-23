import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'react-native-feather';
import useColors from '../hooks/useColors';
import * as Haptics from 'expo-haptics';

export default ({ 
  title, 
  onPress = null,
  iconLeft = null,
  iconRight = null,
  isLast = false,
  isLink = false,
  style = {},
  testID,
}: {
  title: string | React.ReactElement,
  onPress?: any | null,
  iconLeft?: React.ReactElement | null,
  iconRight?: React.ReactElement | null,
  isLast?: boolean | null,
  isLink?: boolean | null,
  style?: any,
  testID?: string,
}) => {
  const colors = useColors()

  return (
    <View
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.menuListItemBorder,
        marginRight: 20,
        marginLeft: 20,
      }}
    >
      <Pressable
        onPress={async () => {
          await Haptics.selectionAsync()
          onPress()
        }}
        style={({ pressed }) => [{
          flexDirection: "row",
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 15,
          paddingBottom: 15,
          opacity: pressed && onPress !== null ? 0.5 : 1,
        }]}
        testID={testID}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
          }}
        >
          {iconLeft && <View style={{ marginRight: 15 }}>{iconLeft}</View>}
          {typeof(title) === 'string' && <Text style={{ flex: 1, fontSize: 17, color: style.color || colors.menuListItemText }} numberOfLines={1} >{title}</Text>}
          {typeof(title) !== 'string' && title}
        </View>
        {iconRight && <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end' }}>{iconRight}</View>}
        {isLink && <ChevronRight width={18} color={colors.menuListItemIcon} />}
      </Pressable>
    </View>
  )
};