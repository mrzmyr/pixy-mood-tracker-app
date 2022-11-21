import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { Pressable, Text, View } from "react-native";
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";
import { LogItem } from "../../hooks/useLogs";
import { RatingDot } from "../Log/View/RatingDot";
import { EntryTags } from "./EntryTags";
import { EntryMessage } from "./EntryMessage";

export const Entry = ({
  item
}: {
  item: LogItem;
}) => {
  const colors = useColors();
  const navigation = useNavigation();
  const haptics = useHaptics();

  const isExtended = item.message || item.tags.length > 0;

  return (
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: colors.logCardBackground,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderRadius: 8,
        opacity: pressed ? 0.8 : 1,
      })}
      onPress={() => {
        haptics.selection();
        navigation.navigate('LogView', {
          id: item.id,
        });
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomColor: isExtended ? colors.entryBorder : 'transparent',
          borderBottomWidth: 1,
          paddingBottom: isExtended ? 16 : 0,
        }}
      >
        <RatingDot
          rating={item.rating}
          onPress={() => {
            haptics.selection();
            navigation.navigate('LogEdit', {
              id: item.id,
              step: 'rating',
            });
          }}
        />
        <View
          style={{
            marginLeft: 12,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.text,
            }}
          >{dayjs(item.dateTime).format('LT')}</Text>
          {/* <Text
            style={{
              fontSize: 17,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >{dayjs(item.dateTime).format('L')}</Text> */}
        </View>
      </View>

      {item.tags.length > 0 && <EntryTags item={item} />}
      {item.message.length > 0 && <EntryMessage item={item} />}
    </Pressable>
  );
};
