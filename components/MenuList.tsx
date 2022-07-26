import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import useColors from '../hooks/useColors';

export default ({ 
  children, 
  style = null,
}: {
  children: React.ReactNode,
  style?: ViewStyle,
}) => {
  const colors = useColors()
  
  return (
    <View
      style={[{
        backgroundColor: colors.menuListItemBackground,
        borderRadius: 8,
      }, style]}
    >{children}</View>
  )
};
