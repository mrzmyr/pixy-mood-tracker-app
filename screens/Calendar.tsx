import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wrapScrollView } from 'react-native-scroll-into-view';
import Calendar from '../components/Calendar';
import CalendarHeader from '../components/CalendarHeader';
import useColors from '../hooks/useColors';

const CustomScrollView = wrapScrollView(ScrollView);

export const CalendarScreen = ({ navigation }) => {
  const colors = useColors()
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      paddingTop: insets.top,
    }}>
      <CalendarHeader />
      <CustomScrollView
        style={{
          backgroundColor: colors.calendarBackground,
          paddingLeft: 16,
          paddingRight: 16,
          width: '100%',
        }}
        scrollIntoViewOptions={{
          animated: false,
          align: 'center',
        }}
      >
        <Calendar navigation={navigation} />
      </CustomScrollView>
    </View>
  )
}