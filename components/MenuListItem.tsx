import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from 'react-native-feather';
import useColors from '../hooks/useColors';
import useHaptics from '../hooks/useHaptics';

export default ({ 
  title, 
  onPress = null,
  iconLeft = null,
  iconRight = null,
  isLast = false,
  isLink = false,
  deactivated = false,
  style = {},
  testID,
}: {
  title: string | React.ReactElement,
  onPress?: any | null,
  iconLeft?: React.ReactElement | null,
  iconRight?: React.ReactElement | null,
  isLast?: boolean | null,
  isLink?: boolean | null,
  deactivated?: boolean,
  style?: any,
  testID?: string,
}) => {
  const colors = useColors()
  const haptics = useHaptics()

  return (
    <View
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.menuListItemBorder,
        marginRight: 20,
        marginLeft: 20,
        maxHeight: 55,
        opacity: deactivated ? 0.5 : 1,
      }}
    >
      <Pressable
        onPress={async () => {
          if(onPress !== null && !deactivated) {
            await haptics.selection()
            onPress()
          }
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
        {iconRight && <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>{iconRight}</View>}
        {isLink && <ChevronRight width={18} color={colors.menuListItemIcon} />}
      </Pressable>
    </View>
  )
};