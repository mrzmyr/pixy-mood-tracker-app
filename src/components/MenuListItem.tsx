import React, { useCallback } from 'react';
import { Pressable, Text, TextStyle, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'react-native-feather';
import useColors from '@/hooks/useColors';
import useHaptics from '@/hooks/useHaptics';

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
  style?: ViewStyle & TextStyle,
  testID?: string,
}) => {
  const colors = useColors()
  const haptics = useHaptics()

  iconRight = iconRight || null

  if (isLink) {
    iconRight = <ChevronRight width={18} color={colors.menuListItemIcon} />;
  }

  const _onPress = useCallback(async () => {
    if (onPress !== null && !deactivated) {
      await haptics.selection()
      onPress()
    }
  }, [onPress, deactivated, haptics])

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
        onPress={_onPress}
        style={({ pressed }) => [{
          flexDirection: "row",
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
          paddingBottom: 8,
          minHeight: 50,
          width: '100%',
          opacity: pressed && onPress ? 0.7 : 1,
          ...style,
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
          {typeof (title) === 'string' && (
            <Text
              style={{
                flex: 1,
                fontSize: 17,
                color: style.color || colors.menuListItemText,
              }}
              numberOfLines={1}
            >{title}</Text>
          )}
          {typeof (title) !== 'string' && title}
        </View>
        {children && (
          <View
            style={{
              justifyContent: 'center',
              width: '100%',
            }}
          >{children}</View>
        )}
        {(iconRight) && (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}>{iconRight}</View>
        )}
      </Pressable>
    </View>
  )
};