import { Text, View } from "react-native";
import Pen from "lucide-react-native/icons/pen";
import MenuListItem from "@/components/menu-list-item";
import useColors from "@/hooks/use-colors";
import type { Person } from "../people-provider";
import { PersonAvatar } from "./person-avatar";

/** Row for one person in {@link PeopleList}, showing avatar and name. */
export const PersonListItem = ({
  person,
  onPress,
}: {
  person: Person;
  onPress: () => void;
}) => {
  const colors = useColors();

  return (
    <MenuListItem onPress={onPress} testID={`person-${person.id}`}>
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
        <Pen width={20} color={colors.tint} />
      </View>
    </MenuListItem>
  );
};
