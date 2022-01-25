import React from 'react';
import { StyleProp, View } from 'react-native';
import useColors from '../hooks/useColors';

export default ({ 
  children, 
  style = null,
}: {
  children: React.ReactNode,
  style?: any,
}) => {
  const colors = useColors()
  
  return (
    <View
      style={[{
        backgroundColor: colors.menuListItemBackground,
        borderRadius: 10,
      }, style]}
    >{children}</View>
  )
};
