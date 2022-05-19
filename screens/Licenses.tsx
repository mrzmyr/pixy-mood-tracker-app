import { ScrollView, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import useColors from '../hooks/useColors';
import licenses from '../licenses.json';

export const LicensesScreen = () => {
  const colors = useColors()
  
  const text = licenses.data.body.map((license, index) => license.map((item, index) => index === 0 ? `**${item}**` : item).join('\n')).join('\n\n')
  
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
          <View style={{
            marginTop: 20
          }}>
            <Markdown style={{
              body: {color: colors.text, fontSize: 17, lineHeight: 24 },
            }}>
              {text}
            </Markdown>
          </View>
      </ScrollView>
    </View>
  );
}
