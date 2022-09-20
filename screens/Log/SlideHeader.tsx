import { View } from 'react-native';

export const SlideHeader = ({
  left, right
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) => {
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: -16,
    }}>
      <View
        style={{
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >{left}</View>
      <View
        style={{
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >{right}</View>
    </View>
  );
};
