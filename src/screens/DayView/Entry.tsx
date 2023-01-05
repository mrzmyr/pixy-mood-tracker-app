import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { Pressable, Text, View } from "react-native";
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";
import { LogItem, useLogUpdater } from "../../hooks/useLogs";
import { RatingDot } from "../Log/View/RatingDot";
import { EntryTags } from "./EntryTags";
import { EntryMessage } from "./EntryMessage";
import LinkButton from "@/components/LinkButton";
import { Edit, Trash } from "react-native-feather";
import { askToRemove } from "@/helpers/prompts";
import { EntryEmotions } from "./EntryEmotions";

export const Entry = ({
  item,
  isExpanded,
}: {
  item: LogItem;
  isExpanded: boolean;
}) => {
  const colors = useColors();
  const navigation = useNavigation();
  const haptics = useHaptics();

  const isExtended = item.message || item.tags.length > 0 || item.emotions.length > 0;
  const logUpdater = useLogUpdater();

  return (
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: colors.logCardBackground,
        borderWidth: 1,
        borderColor: colors.logCardBorder,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderRadius: 12,
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
          paddingBottom: isExtended ? 12 : 0,
          marginBottom: isExtended ? 12 : 0,
        }}
      >
        <RatingDot
          rating={item.rating}
          onPress={() => {
            navigation.navigate('LogView', {
              id: item.id,
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
        </View>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <LinkButton
            onPress={() => {
              navigation.navigate('LogEdit', {
                id: item.id,
                step: 'rating',
              });
            }}
            style={{
              marginLeft: -8,
              marginTop: -8,
              marginBottom: -8,
              marginRight: 4,
              paddingTop: 16,
              paddingBottom: 16,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            <Edit color={colors.tint} width={22} height={22} />
          </LinkButton>
          <LinkButton
            style={{
              marginLeft: -8,
              marginTop: -8,
              marginBottom: -8,
              marginRight: -8,
              paddingTop: 16,
              paddingBottom: 16,
              paddingLeft: 16,
              paddingRight: 16,
            }}
            onPress={() => {
              askToRemove().then(() => logUpdater.deleteLog(item.id))
            }}
          >
            <Trash color={colors.tint} width={22} height={22} />
          </LinkButton>
        </View>
      </View>

      {item.emotions.length > 0 && <EntryEmotions isExpanded={isExpanded} item={item} />}
      {item.tags.length > 0 && <EntryTags isExpanded={isExpanded} item={item} />}
      {item.message.length > 0 && <EntryMessage isExpanded={isExpanded} item={item} />}
    </Pressable>
  );
};
