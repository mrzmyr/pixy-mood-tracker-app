import React from 'react';
import { View } from 'react-native';
import useColors from '../hooks/useColors';

export default ({ children, style = {} }) => {
  const colors = useColors()
  
  return (
    <View
      style={[style, {
        // marginTop: 25,
        backgroundColor: colors.menuListItemBackground,
        borderRadius: 10,
      }]}
    >{children}</View>
  )
};
