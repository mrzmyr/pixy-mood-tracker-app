import Button from "@/components/Button";
import { STATISTIC_MIN_LOGS } from "@/constants/Config";
import { t } from "@/helpers/translation";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import _ from "lodash";
import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PlusCircle } from "react-native-feather";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/hooks/useLogs";
import useHaptics from "@/hooks/useHaptics";
import { PromoCards } from "./PromoCards";

export const CalendarFooter = () => {
  const colors = useColors();
  const logState = useLogState();
  const navigation = useNavigation();
  const haptics = useHaptics();

  const statisticsUnlocked = logState.items.length >= STATISTIC_MIN_LOGS;

  const emojis = ['🎉', '🎊', '🏋', '🎖', '🏄', '🎆', '🎇', '🤩', '🏆'];
  const randomEmoji = useRef(_.sample(emojis));
  const randomNumber = useRef(_.random(0, 10)).current;

  const [emoji, setEmoji] = useState(randomEmoji.current);

  const onEmojiPress = () => {
    setEmoji(_.sample(emojis));
    haptics.selection();
  };


  const hasTodayItem = logState.items.find(item => {
    return dayjs(item.dateTime).isSame(dayjs(), 'day');
  });

  return (
    <View
      style={{}}
    >
      {!hasTodayItem ? (
        <View
          style={{
            marginTop: 24,
          }}
        >
          <Button
            icon={<PlusCircle width={24} height={24} color={colors.primaryButtonText} />}
            onPress={() => {
              navigation.navigate("LogCreate", {
                date: dayjs().format("YYYY-MM-DD"),
              });
            }}
          >{t('add_today_entry')}</Button>
        </View>
      ) : (
        <>
          <Pressable
            onPress={onEmojiPress}
            style={{
              marginTop: 24,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                color: colors.text,
                fontWeight: 'bold',
                marginTop: 16,
              }}
            >{emoji} {t(`tracking_done_title_${randomNumber}`)}</Text>
            <Text
              style={{
                fontSize: 17,
                color: colors.textSecondary,
                marginTop: 8,
                lineHeight: 24,
              }}
            >{t(`tracking_done_description_${randomNumber}`)}</Text>
          </Pressable>
          <Button
            icon={<PlusCircle width={24} height={24} color={colors.primaryButtonText} />}
            type="tertiary"
            style={{
              marginTop: 8,
            }}
            onPress={() => {
              navigation.navigate("LogCreate", {
                date: dayjs().format("YYYY-MM-DD"),
              });
            }}
          >{t('add_today_another_entry')}</Button>
        </>
      )}
      {statisticsUnlocked && (
        <PromoCards />
      )}
    </View>
  );
};
