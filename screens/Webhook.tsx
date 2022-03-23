import dayjs from 'dayjs';
import { useState } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';
import MenuList from '../components/MenuList';
import MenuListHeadline from '../components/MenuListHeadline';
import MenuListItem from '../components/MenuListItem';
import Tag from '../components/Tag';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import { useSegment } from '../hooks/useSegment';
import { SettingsState, useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackScreenProps } from '../types';

export default function WebhookScreen({ navigation }: RootStackScreenProps<'Webhook'>) {
  const { settings, setSettings } = useSettings()
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()

  const [enabled, setEnabled] = useState(settings.webhookEnabled)
  const [url, setUrl] = useState(settings.webhookUrl)
  
  const debouncedSetUrl = useDebouncedCallback((value) => {
    setSettings((settings: SettingsState) => ({ ...settings, webhookUrl: value }))
  }, 200);
  
  const debouncedSetEnabled = useDebouncedCallback((value) => {
    setSettings((settings: SettingsState) => ({ ...settings, webhookEnabled: value }))
  }, 50);
  
  return (
    <ScrollView
      style={{
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <View
        style={{
          padding: 20,
        }}
      >
      <MenuList>
        <MenuListItem
          title={i18n.t('webhook')}
          iconRight={
            <Switch
              ios_backgroundColor={colors.backgroundSecondary}
              onValueChange={() => {
                segment.track('webhook_toggle', { enabled: !enabled })
                setEnabled(!enabled)
                debouncedSetEnabled(!enabled)
              }}
              value={enabled}
              testID={`webhook-enabled`}
            />
          }
          isLast
        ></MenuListItem>
      </MenuList>
      { settings.webhookEnabled && 
        <View
          style={{
            marginTop: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: colors.textInputBackground,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                flex: 2,
                fontSize: 17,
                color: colors.text,
                marginLeft: 20,
              }}
            >{i18n.t('webhook_url')}</Text>
            <TextInput 
              style={{
                flex: 10,
                fontSize: 17,
                color: colors.textInputText,
                padding: 15,
                paddingRight: 20,
              }}
              testID={`webhook-url`}
              placeholder={i18n.t('webhook_url_placeholder')}
              placeholderTextColor={colors.textInputPlaceholder}
              value={url}
              onChange={event => {
                segment.track('webhook_url_change')
                setUrl(event.nativeEvent.text)
                debouncedSetUrl(event.nativeEvent.text)
              }}
            />
          </View>
          <TextInfo>{i18n.t('webhook_url_help')}</TextInfo>
          {settings.webhookHistory.length > 0 && <MenuListHeadline>{i18n.t('webhook_history')}</MenuListHeadline>}
          <MenuList
            style={{
            }}
          >
            { settings.webhookHistory.sort((a,b) => +new Date(b.date) - +new Date(a.date)).map((entry, index) => (
              <MenuListItem
                key={entry?.date}
                title={
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        color: colors.text,
                        marginRight: 10,
                      }}
                    >{entry?.date ? dayjs(entry.date).format('lll') : '-'}</Text>
                    <Tag type={entry.isError ? 'error' : 'success'}>{entry.isError ? i18n.t('webhook_status_error') : i18n.t('webhook_status_success')}</Tag>
                  </View>
                }
                onPress={() => navigation.navigate('WebhookHistoryEntry', { entry, date: entry.date })}
                testID={`webhook-history-entry-${index}`}
                isLast={index === settings.webhookHistory.length - 1}
                isLink
              ></MenuListItem>
            ))}
          </MenuList>
        </View>
      }
      </View>
    </ScrollView>
  );
}
