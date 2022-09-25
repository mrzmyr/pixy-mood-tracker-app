import { useState } from 'react';
import { Dimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { wrapScrollView } from 'react-native-scroll-into-view';
import Calendar from '../../components/Calendar';
import CalendarHeader from '../../components/CalendarHeader';
import useColors from '../../hooks/useColors';
import { CalendarBottomSheet } from './CalendarBottomSheet';

const CustomScrollView = wrapScrollView(ScrollView);

export const CalendarScreen = ({ navigation }) => {
  const colors = useColors()
  const windowHeight = Dimensions.get('window').height;
  const [offsetY, setOffsetY] = useState(0);

  const jumpIntoView = (ref: View) => {
    ref.measure((x, y, width, height, pageX, pageY) => {
      if(pageY !== undefined) {
        setOffsetY(pageY - (windowHeight / 4));
      }
    })
  }
  
  return (
    <View style={{
      flex: 1,
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
        contentOffset={{ y: offsetY }}
      >
        <Calendar jumpIntoView={jumpIntoView} />
      </CustomScrollView>
      <CalendarBottomSheet />
    </View>
  )
}