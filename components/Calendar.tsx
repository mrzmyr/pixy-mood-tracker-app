import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";
import { Platform, Text, View } from "react-native";
import {
  useScrollIntoView
} from 'react-native-scroll-into-view';
import useColors from "../hooks/useColors";
import { useLogs } from "../hooks/useLogs";
import { useTranslation } from "../hooks/useTranslation";
import CalendarMonth from "./CalendarMonth";
import LinkButton from "./LinkButton";

export default function Calendar({
  navigation,
  jumpIntoView,
}: {
  navigation: any;
  jumpIntoView: (ref: any) => void;
}) {
  const colors = useColors()
  const { state } = useLogs()
  const i18n = useTranslation()
  const today = dayjs();

  const months = [];
  for (let i = -12; i <= 0; i++) {
    const month = today.clone().add(i, 'month').startOf('month');
    months.push({
      dateString: month.format('YYYY-MM-DD'),
      items: useMemo(() => Object.keys(state.items)
        .filter(dateString => dayjs(dateString).isSame(month, 'month'))
        .map(dateString => state.items[dateString]), 
        [
          JSON.stringify(
            Object.keys(state.items)
              .filter(dateString => dayjs(dateString).isSame(month, 'month'))
              .map(dateString => state.items[dateString])
          )
        ])
    });
  }

  const futureMonths = []
  for (let i = 1; i <= 1; i++) {
    const month = today.clone().add(i, 'month').startOf('month');
    futureMonths.push({
      dateString: month.format('YYYY-MM-DD')
    });
  }
  
  const scrollIntoView = useScrollIntoView();
  const viewRef = useRef(null);
  
  useEffect(() => {
    if(viewRef.current !== null) {
      jumpIntoView(viewRef.current)
    }
  }, [viewRef.current]);

  const scrollToToday = () => {
    scrollIntoView(viewRef.current, { animated: true })
  }

  return (
    <View
      style={{
        paddingBottom: 40,
      }}
    >
      <View
        style={{
          marginTop: 32,
          paddingBottom: 16,
          marginBottom: 16,
        }}
      >
        <LinkButton
          onPress={() => scrollToToday()}
          type="primary"
          testID="calendar-back-to-today-top"
        >{i18n.t('back_to_today')}</LinkButton>
      </View>
      {months.map(({ dateString, items }) => (
        <CalendarMonth 
          key={dateString} 
          dateString={dateString} 
          ref={dayjs().isSame(dateString, 'month') ? viewRef : null}
          items={items} 
        />
      ))}
      {futureMonths.map(({ dateString }) => (
        <CalendarMonth 
          key={dateString} 
          dateString={dateString} 
          ref={dayjs().isSame(dateString, 'month') ? viewRef : null}
        />
      ))}
      <Text
        style={{
          paddingTop: 80,
          paddingBottom: Platform.OS === 'ios' ? 0 : 40,
          marginBottom: -80,
          textAlign: 'center',
          fontSize: 15,
          color: colors.textSecondary,
        }}
      >🙏 The future will be great.</Text>
    </View>
  )
}
