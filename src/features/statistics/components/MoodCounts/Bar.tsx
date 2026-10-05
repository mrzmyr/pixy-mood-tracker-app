import { useSetting } from "@/state/settings";
import { View } from "react-native";
import { RATING_KEYS } from "@/constants/Ratings";
import useScale from "@/hooks/useScale";
import { RADIUS } from "@/constants/Radius";

/** Single rating bar in {@link Content}; `height` is in points. */
export const Bar = ({ height, ratingName }) => {
  const scaleType = useSetting("scaleType");
  const scale = useScale(scaleType);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "flex-end",
        flex: RATING_KEYS.length,
        marginHorizontal: 2,
      }}
    >
      <View
        style={{
          height,
          width: "100%",
          backgroundColor: scale.colors[ratingName].background,
          borderTopLeftRadius: RADIUS.xs,
          borderTopRightRadius: RADIUS.xs,
        }}
      />
    </View>
  );
};
