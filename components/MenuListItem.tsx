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
  children,
  testID,
}: {
  title?: string | React.ReactElement,
  onPress?: any | null,
  iconLeft?: React.ReactElement | null,
  iconRight?: React.ReactElement | null,
  children?: React.ReactNode,
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
        marginRight: 16,
        marginLeft: 16,
        opacity: deactivated ? 0.5 : 1,
        justifyContent: 'center',
        alignItems: 'center',
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
          paddingTop: 12,
          paddingBottom: 12,
          minHeight: 55,
          width: '100%',
        }]}
        testID={testID}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {iconLeft && <View style={{ marginRight: 15 }}>{iconLeft}</View>}
          {typeof(title) === 'string' && (
            <Text 
              style={{ 
                flex: 1, 
                fontSize: 17, 
                color: style.color || colors.menuListItemText 
              }} 
              numberOfLines={1}
            >{title}</Text>
          )}
          {typeof(title) !== 'string' && title}
        </View>
        {children && (
          <View 
            style={{
              justifyContent: 'center', 
              width: '100%',
              maxHeight: 55,
            // backgroundColor: 'green'
            }}
          >{children}</View>
        )}
        {(iconRight || isLink) && (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'flex-end',
          }}>{iconRight || <ChevronRight width={18} color={colors.menuListItemIcon} />}</View>
        )}
      </Pressable>
    </View>
  )
};