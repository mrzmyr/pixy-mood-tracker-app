import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import { LogItem } from "@/hooks/useLogs";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { Edit, Trash } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { Emotions } from "./Emotions";
import { Message } from "./Message";
import { RatingDot } from "./RatingDot";
import { Sleep } from "./Sleep";
import { Tags } from "./Tags";

const EntryHeader = ({
  item,
  onEdit,
  onDelete,
}: {
  item: LogItem;
  onEdit: (item: LogItem) => void;
  onDelete: (item: LogItem) => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomColor: colors.logCardBorder,
        borderBottomWidth: 1,
        paddingBottom: 12,
      }}
    >
      <RatingDot
        rating={item.rating}
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
            onEdit(item);
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
          <Edit color={colors.tint} size={22} />
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
            onDelete(item);
          }}
        >
          <Trash color={colors.tint} size={22} />
        </LinkButton>
      </View>
    </View>
  );
};

export const Entry = ({
  item,
  onEdit,
  onDelete,
}: {
  item: LogItem;
  onEdit: (item: LogItem) => void;
  onDelete: (item: LogItem) => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: 16,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.logCardBorder,
          backgroundColor: colors.logCardBackground,
          position: 'relative',
        }}
      >
        <EntryHeader
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
        <ScrollView>
          <View
            style={{
              paddingBottom: 24,
            }}
          >
            <View
              style={{
                marginTop: 8,
              }}
            >
              <Sleep item={item} />
            </View>
            <View
              style={{
                marginTop: 8,
              }}
            >
              <Emotions item={item} />
            </View>
            <View
              style={{
                marginTop: 8,
              }}
            >
              <Tags item={item} />
            </View>
            <View
              style={{
                marginTop: 8,
              }}
            >
              <Message item={item} />
            </View>
          </View>
        </ScrollView>
        <LinearGradient
          colors={[colors.logCardBackground, colors.logCardBackgroundTransparent]}
          style={{
            position: 'absolute',
            height: 24,
            top: 67,
            left: 16,
            right: 16,
            zIndex: 999,
          }}
          pointerEvents="none" />
        <LinearGradient
          colors={[colors.logCardBackgroundTransparent, colors.logCardBackground]}
          style={{
            position: 'absolute',
            height: 24,
            bottom: 0,
            left: 16,
            right: 16,
            zIndex: 999,
          }}
          pointerEvents="none" />
      </View>
    </View>
  );
};
