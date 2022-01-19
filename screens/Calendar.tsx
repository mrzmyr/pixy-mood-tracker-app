import { StatusBar } from 'expo-status-bar';
import { Platform, ScrollView, View } from 'react-native';
import { wrapScrollView } from 'react-native-scroll-into-view';
import Calendar from '../components/Calendar';
import CalendarHeader from '../components/CalendarHeader';
import useColors from '../hooks/useColors';

const CustomScrollView = wrapScrollView(ScrollView);

export default function CalendarScreen({ navigation }) {
  const colors = useColors()
  
  return (
    <View style={{
      flex: 1,
      justifyContent: "center",
      flexDirection: "column",
    }}>
      <CalendarHeader />
      <StatusBar animated={true} style={Platform.OS === 'ios' ? 'auto' : 'light'} />
      <CustomScrollView
        style={{
          marginTop: 0,
          backgroundColor: colors.background,
          paddingLeft: 15,
          paddingRight: 15,
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