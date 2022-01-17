import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import DataEntyList from '../components/DataEntryList';
import TextCode from '../components/TextCode';
import TextHeadline from '../components/TextHeadline';
import useColors from '../hooks/useColors';
import { SettingsWebhookHistoryEntry, useSettings } from '../hooks/useSettings';

const DataEntyItem = ({ title, value }) => {
  const colors = useColors()

  return (
    <View>
        <Text style={{ fontSize: 15, color: colors.text, opacity: 0.5 }}>{title}</Text>
        <Text style={{ fontSize: 17, color: colors.text, marginTop: 5, }}>{value}</Text>
    </View>
  )
}

const DataEntyDivider = () => {
  const colors = useColors()
  return <View style={{ height: 1, backgroundColor: colors.menuListItemBorder, marginTop: 10, marginBottom: 10 }}></View>
}

export default function WebhookHistoryEntry({ navigation, route }) {
  const colors = useColors()

  const { entry }: { entry: SettingsWebhookHistoryEntry } = route.params

  useEffect(() => {
    navigation.setOptions({ headerTitle: dayjs(entry.date).format('DD.MM.YYYY - HH:mm:ss') });
  }, [])

  return (
    <View style={{ 
      flex: 1,
      paddingLeft: 20,
      paddingRight: 20,
      backgroundColor: colors.backgroundSecondary,
    }}>

      <TextHeadline style={{ marginTop: 20, marginBottom: 20 }}>Request</TextHeadline>
      <DataEntyList>
        <DataEntyItem title='URL' value={entry.url} />
        <DataEntyDivider />
        <DataEntyItem title='Status Text' value={
          <TextCode style={{ fontSize: 14 }}>{JSON.stringify(JSON.parse(entry.body), null, 2)}</TextCode>
        } />
      </DataEntyList>
      
      <TextHeadline style={{ marginTop: 20, marginBottom: 20 }}>Response</TextHeadline>
      <DataEntyList>
        {!!entry.statusCode && <DataEntyItem title='Status Code' value={entry.statusCode} />}
        {!!entry.statusCode && !!entry.statusText && <DataEntyDivider />}
        {!!entry.statusText && <DataEntyItem title='Status Text' value={entry.statusText} />}
        {!!entry.statusText && entry.isError && <DataEntyDivider />}
        {entry.isError && <DataEntyItem title='Error Message' value={entry.errorMessage} />}
      </DataEntyList>
    </View>
  );
}
