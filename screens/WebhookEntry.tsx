import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import DataEntyList from '../components/DataEntryList';
import TextCode from '../components/TextCode';
import TextHeadline from '../components/TextHeadline';
import useColors from '../hooks/useColors';
import { SettingsWebhookEntry } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';

const DataEntyItem = ({ title, value }) => {
  const colors = useColors()

  return (
    <View>
        <Text style={{ fontSize: 14, color: colors.text, opacity: 0.5 }}>{title}</Text>
        <Text style={{ fontSize: 17, color: colors.text, marginTop: 5, }}>{value}</Text>
    </View>
  )
}

const DataEntyDivider = () => {
  const colors = useColors()
  return <View style={{ height: 1, backgroundColor: colors.menuListItemBorder, marginTop: 10, marginBottom: 10 }}></View>
}

export const WebhookEntryScreen = ({ navigation, route }) => {
  const colors = useColors()
  const i18n = useTranslation()

  const { entry }: { entry: SettingsWebhookEntry } = route.params

  useEffect(() => {
    navigation.setOptions({ headerTitle: dayjs(entry.date).format('lll') });
  }, [])

  return (
    <View style={{ 
      flex: 1,
      paddingLeft: 20,
      paddingRight: 20,
      backgroundColor: colors.backgroundSecondary,
    }}>

      <TextHeadline style={{ marginTop: 20, marginBottom: 20 }}>{i18n.t('webhook_entry_request')}</TextHeadline>
      <DataEntyList>
        <DataEntyItem title={i18n.t('webhook_entry_url')} value={
          <TextCode style={{ fontSize: 14 }}>{entry.url}</TextCode>
        } />
        <DataEntyDivider />
        <DataEntyItem title={i18n.t('webhook_entry_status_text')} value={
          <TextCode style={{ fontSize: 14 }}>{JSON.stringify(JSON.parse(entry.body), null, 2)}</TextCode>
        } />
      </DataEntyList>
      
      <TextHeadline style={{ marginTop: 20, marginBottom: 20 }}>{i18n.t('webhook_entry_response')}</TextHeadline>
      <DataEntyList>
        {!!entry.statusCode && <DataEntyItem title={i18n.t('webhook_entry_status_code')} value={entry.statusCode} />}
        {!!entry.statusCode && !!entry.statusText && <DataEntyDivider />}
        {!!entry.statusText && <DataEntyItem title={i18n.t('webhook_entry_status_text')} value={entry.statusText} />}
        {!!entry.statusText && entry.isError && <DataEntyDivider />}
        {entry.isError && <DataEntyItem title={i18n.t('webhook_entry_error_message')} value={entry.errorMessage} />}
      </DataEntyList>
    </View>
  );
}
