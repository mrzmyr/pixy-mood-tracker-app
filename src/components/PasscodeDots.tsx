import React, { forwardRef, RefObject } from 'react';
import { View } from 'react-native';
import useColors from '@/hooks/useColors';

export const PasscodeDots = forwardRef(({
  code,
}: {
  code: string,
}, ref: RefObject<View>) => {
  const colors = useColors();

  return (
    <View ref={ref}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 20,
          marginBottom: 20,
          width: '100%',
        }}
      >
        <View style={{
          padding: 10,
          borderColor: colors.text,
          backgroundColor: code.length >= 1 ? colors.text : colors.passcodeDotBackground,
          borderRadius: 999,
          aspectRatio: 1,
          marginRight: 20,
        }}></View>
        <View style={{
          padding: 10,
          borderColor: colors.text,
          backgroundColor: code.length >= 2 ? colors.text : colors.passcodeDotBackground,
          borderRadius: 999,
          aspectRatio: 1,
          marginRight: 20,
        }}></View>
        <View style={{
          padding: 10,
          borderColor: colors.text,
          backgroundColor: code.length >= 3 ? colors.text : colors.passcodeDotBackground,
          borderRadius: 999,
          aspectRatio: 1,
          marginRight: 20,
        }}></View>
        <View style={{
          padding: 10,
          borderColor: colors.text,
          backgroundColor: code.length >= 4 ? colors.text : colors.passcodeDotBackground,
          borderRadius: 999,
          aspectRatio: 1,
        }}></View>
      </View>
    </View>
  );
});
