import { ScrollView, Text, View } from 'react-native';
import useColors from '../hooks/useColors';
import licenses from '../licenses.json';

export default function LicensesScreen({ navigation }) {
  const colors = useColors()
  
  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <ScrollView style={{ 
        padding: 20,
        backgroundColor: colors.background,
      }}>
        {licenses.data.body.map((license, index) => (
          <View style={{
            marginTop: 20
          }}>
            {license.map((item, index) => <Text style={{ color: colors.text, fontWeight: index === 0 ? 'bold' : 'normal' }}>{item}</Text>)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
