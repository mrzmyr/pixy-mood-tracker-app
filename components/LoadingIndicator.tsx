import { Animated, Easing, Platform } from "react-native";
import { Loader } from "react-native-feather";

export default function LoadingIndicator({
  size = 20,
  color,
}: {
  size: number,
  color: string,
}) {
  let spinValue = new Animated.Value(0);

  Animated.loop(
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
    }),
    {iterations: -1},
  ).start();

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  })

  return (
    <Animated.View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        transform: [{
          rotate: spin
        }]
      }}
    >
      <Loader color={color} width={size} />
    </Animated.View>
  )
}