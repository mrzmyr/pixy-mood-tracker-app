import * as WebBrowser from 'expo-web-browser';
import { ScrollView, View } from 'react-native';
import { Shield } from 'react-native-feather';
import Markdown from 'react-native-markdown-display';
import LinkButton from '../components/LinkButton';
import useColors from '../hooks/useColors';
import { useSegment } from '../hooks/useSegment';
import { useTranslation } from '../hooks/useTranslation';

export default function PrivacyScreen() {
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()
  
  const _handlePressButtonAsync = async () => {
    await WebBrowser.openBrowserAsync('https://y99.notion.site/Privacy-Policy-236e2f58ea48429e8cfa07c16536f3df', {
      readerMode: true
    });
    segment.track('privacy_policy_opened')
  };
  
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <ScrollView style={{ 
        padding: 20,
      }}>
        <View style={{
          paddingBottom: 80,
        }}>
          <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <Shield fill={colors.background} color={colors.text} width={80} height={30} />
          </View>
          <Markdown style={{
            body: {color: colors.text, fontSize: 16, lineHeight: 24 },
            heading3: { fontWeight: 'bold', fontSize: 21, lineHeight: 28, marginBottom: 0, marginTop: 20 },
            list_item: { marginTop: 5, marginLeft: -5 },
            bullet_list: { marginBottom: 10 },
            hr: { backgroundColor: colors.text, marginTop: 20, marginBottom: 20, opacity: 0.2 },
            em: { color: colors.text, opacity: 0.5, fontStyle: 'normal' },
          }}>
            {i18n.t('privacy_content')}
          </Markdown>
          
          <LinkButton
            style={{
              marginTop: 20,
            }}
            onPress={_handlePressButtonAsync}
          >{i18n.t('privacy_policy')}</LinkButton>
        </View>
      </ScrollView>
    </View>
  );
}
