import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import { Edit } from "lucide-react-native";
import { Text, View } from "react-native";

/**
 * Section title inside an entry card; the edit action shows only when
 * `onEdit` is given.
 */
export const SectionHeader = ({
  title,
  onEdit,
}: {
  title: string;
  onEdit?: () => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "bold",
            color: colors.text,
          }}
        >
          {title}
        </Text>
      </View>
      {onEdit && (
        <LinkButton onPress={onEdit} type="secondary">
          <Edit size={20} color={colors.textSecondary} />
        </LinkButton>
      )}
    </View>
  );
};
