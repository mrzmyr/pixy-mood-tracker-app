import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const { height } = Dimensions.get("window");

/**
 * Window size captured once at module load; it does not update on rotation
 * or split view.
 */
export default {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
};
