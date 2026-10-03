import { Text, View } from "react-native";
import { Edit2 } from "react-native-feather";
import MenuListItem from "@/components/MenuListItem";
import useColors from "@/hooks/useColors";
import type { Person } from "../PeopleProvider";
import { PersonAvatar } from "./PersonAvatar";

/** Row for one person in {@link PeopleList}, showing avatar and name. */
export const PersonListItem = ({
  person,
  isLast,
  onPress,
}: {
  person: Person;
  isLast: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();

  return (
    <MenuListItem
      onPress={onPress}
      isLast={isLast}
      testID={`person-${person.id}`}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <PersonAvatar person={person} size={32} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 12,
            fontSize: 17,
            color: colors.text,
          }}
        >
          {person.name}
        </Text>
        <Edit2 width={20} color={colors.tint} />
      </View>
    </MenuListItem>
  );
};
