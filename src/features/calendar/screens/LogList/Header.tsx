import { Text, View } from "react-native";
import { CloseButton } from "@/components/CloseButton";
import useColors from "@/hooks/useColors";

/** Modal header of the day entry list with the day title and close action. */
export const Header = ({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        paddingHorizontal: 16,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            {title}
          </Text>
        </View>
      </View>
      <View
        style={{
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-evenly",
            marginRight: -8,
          }}
        >
          <CloseButton testID="log-list-close" onPress={() => onClose?.()} />
        </View>
      </View>
    </View>
  );
};
