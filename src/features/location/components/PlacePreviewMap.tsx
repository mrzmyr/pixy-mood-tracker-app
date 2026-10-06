import { MapPin } from "lucide-react-native";
import { View } from "react-native";
import useColors from "@/hooks/useColors";
import type { LogLocation } from "@/types";

/**
 * Map preview stand-in for platforms without `expo-maps`: a pin icon.
 * Apple Maps on iOS (`PlacePreviewMap.ios.tsx`).
 */
export const PlacePreviewMap = (_props: { location: LogLocation }) => {
  const colors = useColors();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <MapPin size={28} color={colors.textSecondary} />
    </View>
  );
};
