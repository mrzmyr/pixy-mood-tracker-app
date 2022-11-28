import { Dimensions } from "react-native";

export const getLogEditMarginTop = () => {
  let marginTop = 32;

  if (Dimensions.get('screen').height < 800) marginTop = 32;
  if (Dimensions.get('screen').height < 700) marginTop = 16;

  return marginTop;
}