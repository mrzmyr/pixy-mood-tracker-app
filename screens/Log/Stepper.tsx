import { View } from 'react-native';
import useColors from '../../hooks/useColors';

export const Stepper = ({
  count, index
}: {
  count: number;
  index: number;
}) => {
  const colors = useColors();
  const steps = [...Array(count).keys()];

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    }}>
      {steps.map((step) => (
        <View
          key={step}
          style={{
            height: 4,
            flexDirection: 'row',
            alignItems: 'center',
            flex: 4,
            borderRadius: 100,
            marginRight: step === steps.length - 1 ? 0 : 16,
            backgroundColor: step === index ? colors.stepperBackgroundActive : colors.stepperBackground,
          }}
        ></View>
      ))}
    </View>
  );
};
