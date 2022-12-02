import { Image, ImageProps, Platform, useColorScheme } from 'react-native';

const HEADER_IMAGES = {
  androidDark: [
    require(`../../../assets/images/onboarding/android-dark-1.png`),
    require(`../../../assets/images/onboarding/android-dark-2.png`),
    require(`../../../assets/images/onboarding/android-dark-3.png`),
    require(`../../../assets/images/onboarding/android-dark-4.png`),
    require(`../../../assets/images/onboarding/android-dark-5.png`),
  ],
  androidLight: [
    require(`../../../assets/images/onboarding/android-light-1.png`),
    require(`../../../assets/images/onboarding/android-light-2.png`),
    require(`../../../assets/images/onboarding/android-light-3.png`),
    require(`../../../assets/images/onboarding/android-light-4.png`),
    require(`../../../assets/images/onboarding/android-light-5.png`),
  ],
  iosDark: [
    require(`../../../assets/images/onboarding/ios-dark-1.png`),
    require(`../../../assets/images/onboarding/ios-dark-2.png`),
    require(`../../../assets/images/onboarding/ios-dark-3.png`),
    require(`../../../assets/images/onboarding/ios-dark-4.png`),
    require(`../../../assets/images/onboarding/ios-dark-5.png`),
  ],
  iosLight: [
    require(`../../../assets/images/onboarding/ios-light-1.png`),
    require(`../../../assets/images/onboarding/ios-light-2.png`),
    require(`../../../assets/images/onboarding/ios-light-3.png`),
    require(`../../../assets/images/onboarding/ios-light-4.png`),
    require(`../../../assets/images/onboarding/ios-light-5.png`),
  ],
}

export const HeaderImage = ({ index, style, ...props }: {
  index: number;
  style?: ImageProps['style'];
  props?: ImageProps;
}) => {
  const isAndroid = Platform.OS === 'android';
  const scheme = useColorScheme();

  if (scheme === 'dark') {
    return <Image style={style} {...props} source={isAndroid ? HEADER_IMAGES.androidDark[index] : HEADER_IMAGES.iosDark[index]} />;
  } else {
    return <Image style={style} {...props} source={isAndroid ? HEADER_IMAGES.androidLight[index] : HEADER_IMAGES.iosLight[index]} />;
  }
};
