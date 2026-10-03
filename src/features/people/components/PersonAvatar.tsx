import { Image } from "expo-image";
import { User } from "lucide-react-native";
import { View } from "react-native";
import useColors from "@/hooks/useColors";
import { getAvatarUri } from "../avatars";
import type { Person } from "../PeopleProvider";

/**
 * Round avatar for a person. Without a photo it shows a gray user icon; no
 * per-person color exists. `previewUri` shows a picked image that is not
 * stored yet.
 */
export const PersonAvatar = ({
  person,
  size = 24,
  previewUri = null,
}: {
  person: Pick<Person, "id" | "name" | "avatar" | "updatedAt">;
  size?: number;
  previewUri?: string | null;
}) => {
  const colors = useColors();
  const uri =
    previewUri ?? (person.avatar ? getAvatarUri(person.avatar) : null);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondary,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessible={false}
      importantForAccessibility="no"
    >
      {uri ? (
        <Image
          source={{
            uri,
            cacheKey: `${person.id}-${person.updatedAt ?? ""}-${previewUri ?? ""}`,
          }}
          recyclingKey={`${person.id}-${person.updatedAt ?? ""}-${previewUri ?? ""}`}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityLabel={person.name}
        />
      ) : (
        <User
          size={Math.round(size * 0.6)}
          color={colors.textSecondary}
          strokeWidth={2}
        />
      )}
    </View>
  );
};
