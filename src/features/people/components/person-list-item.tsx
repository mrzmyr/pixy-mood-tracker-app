import { View } from "react-native";
import Pen from "lucide-react-native/icons/pen";
import MenuListItem from "@/components/menu-list-item";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import type { Person } from "../people-provider";
import { PersonAvatar } from "./person-avatar";

/**
 * Row for one person in {@link PeopleList}, showing avatar and name. A
 * sortable list passes `hasTrailingControl`: the pen gives way to the
 * reorder handle drawn over the trailing edge.
 */
export const PersonListItem = ({
  person,
  onPress,
  hasTrailingControl = false,
}: {
  person: Person;
  onPress: () => void;
  hasTrailingControl?: boolean;
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
        <Label
          size={16}
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 12,
            color: colors.text,
          }}
        >
          {person.name}
        </Label>
        {hasTrailingControl ? (
          <View style={{ width: 44 }} />
        ) : (
          <Pen width={20} color={colors.tint} />
        )}
      </View>
    </MenuListItem>
  );
};
