import { View } from "react-native";
import { RADIUS } from "@/constants/Radius";
import { PersonAvatar } from "@/features/people";
import type { Person } from "@/features/people";
import useColors from "@/hooks/useColors";

/**
 * Person avatar with a thin ring. Without a photo the avatar fill matches
 * the card in dark mode; the ring keeps the circle visible.
 */
export const RingedAvatar = ({
  person,
  size,
}: {
  person: Pick<Person, "id" | "name" | "avatar"> & { updatedAt?: string };
  size: number;
}) => {
  const colors = useColors();
  return (
    <View
      style={{
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: colors.cardBorder,
      }}
    >
      <PersonAvatar person={person} size={size} />
    </View>
  );
};
