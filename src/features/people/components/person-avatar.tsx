import { Image } from "expo-image";
import type { ReactNode } from "react";
import User from "lucide-react-native/icons/user";
import { Text, View } from "react-native";
import useColors from "@/hooks/use-colors";
import { getAvatarUri } from "../avatars";
import { getInitials } from "../initials";
import type { Person } from "../people-provider";

/**
 * Round avatar for a person. Without a photo it shows gray initials, or a
 * gray user icon while the name is blank; no per-person color exists. `previewUri` shows a picked image that is not
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
  const initials = getInitials(person.name);
  let content: ReactNode;
  if (uri) {
    content = (
      <Image
        source={{
          uri,
          cacheKey: `${person.id}-${person.updatedAt ?? ""}-${previewUri ?? ""}`,
        }}
        recyclingKey={`${person.id}-${person.updatedAt ?? ""}-${previewUri ?? ""}`}
        style={{ width: size, height: size }}
        contentFit="cover"
      />
    );
  } else if (initials) {
    content = (
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{
          fontSize: Math.round(size * 0.4),
          fontWeight: "600",
          color: colors.textSecondary,
        }}
      >
        {initials}
      </Text>
    );
  } else {
    content = (
      <User
        size={Math.round(size * 0.6)}
        color={colors.textSecondary}
        strokeWidth={2}
      />
    );
  }

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
      {content}
    </View>
  );
};
