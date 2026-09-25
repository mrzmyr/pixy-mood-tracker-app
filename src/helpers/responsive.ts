import { Dimensions } from "react-native";

/** Top margin for logger slides: 16 on screens shorter than 700 pt, else 32. */
export const getLogEditMarginTop = () => {
  let marginTop = 32;

  if (Dimensions.get("screen").height < 800) {
    marginTop = 32;
  }
  if (Dimensions.get("screen").height < 700) {
    marginTop = 16;
  }

  return marginTop;
};
