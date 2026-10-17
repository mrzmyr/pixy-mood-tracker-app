import { MapPin } from "lucide-react-native";
import { View } from "react-native";
import useColors from "@/hooks/useColors";

/**
 * Pin icon in place of a map image: Android, and iOS while the snapshot
 * renders or after it failed.
 */
export const PlacePreviewPlaceholder = () => {
  const colors = useColors();

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <MapPin size={28} color={colors.textSecondary} />
    </View>
  );
};
