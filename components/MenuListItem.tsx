import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { ChevronRight } from 'react-native-feather';
import Colors from '../constants/Colors';
import useColors from '../hooks/useColors';
import useColorScheme from '../hooks/useColorScheme';

export default ({ 
  title, 
  onPress = () => {},
  iconLeft = null,
  iconRight = null,
  isLast = false,
  isLink = false,
  style = {} 
}: {
  title: string,
  onPress?: () => void,
  iconLeft?: React.ReactElement,
  iconRight?: React.ReactElement,
  isLast?: boolean | null,
  isLink?: boolean | null,
  style?: any,
}) => {
  const colors = useColors()
  
  return (
    <View
      style={{
        // marginBottom: 5,
        // backgroundColor: 'red',
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.menuListItemBorder,
        marginRight: 20,
        marginLeft: 20,
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{
          flexDirection: "row",
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 15,
          paddingBottom: 15,
          opacity: pressed ? 0.5 : 1,
        }]}
      >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {iconLeft && <View style={{ marginRight: 15 }}>{iconLeft}</View>}
        {typeof(title) === 'string' && <Text style={{ fontSize: 16, color: style.color || colors.menuListItemText }}>{title}</Text>}
        {typeof(title) !== 'string' && title}
      </View>
      {iconRight && <View style={{ }}>{iconRight}</View>}
      {isLink && <ChevronRight width={18} color={colors.menuListItemIcon} />}
      </Pressable>
    </View>
  )
};