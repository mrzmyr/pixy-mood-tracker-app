import dayjs from 'dayjs';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { ChevronRight } from 'react-native-feather';
import MenuList from '../components/MenuList';
import MenuListHeadline from '../components/MenuListHeadline';
import MenuListItem from '../components/MenuListItem';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import { useSettings } from '../hooks/useSettings';

function Tag({ children, type }) {
  return (
    <View style={{
      backgroundColor: type === 'success' ? '#c6f6d5' : '#fed7d7',
      padding: 2,
      paddingLeft: 7,
      paddingRight: 7,
      borderRadius: 5,
      opacity: 0.8,
    }}>
      <Text style={{ 
        fontSize: 15, 
        color: '#333', 
        opacity: 0.8,
        color: type === 'success' ? '#4caf50' : '#f44336',
      }}>
        {children}
      </Text>
    </View>
  )
}

export default function WebhookScreen({ navigation }) {
  const { settings, setSettings } = useSettings()
  const colors = useColors()

  return (    
    <ScrollView>
      <View
        style={{
          padding: 20,
          backgroundColor: colors.backgroundSecondary,
        }}
      >
      <MenuList>
        <MenuListItem
          title='Webbook'
          iconRight={
            <Switch
              trackColor={{ false: '#767577', true: Platform.OS === 'ios' ? '#4ad461' : '#DDD' }}
              ios_backgroundColor="#3e3e3e"
              onValueChange={() => setSettings(settings => ({ ...settings, webhookEnabled: !settings.webhookEnabled }))}
              value={settings.webhookEnabled}
              style={{
                marginTop: -5,
                marginBottom: -5,
              }}
            />
          }
          onPress={() => setSettings(settings => ({ ...settings, webhookEnabled: !settings.webhookEnabled }))}
          isLast
        ></MenuListItem>
      </MenuList>
      <TextInfo>Webhooks are used to send data to a HTTP endpoint via the POST method.</TextInfo>
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
            >URL</Text>
            <TextInput 
              style={{
                flex: 10,
                fontSize: 17,
                color: colors.textInputText,
                padding: 15,
                paddingRight: 20,
              }}
              placeholder='Webhook URL'
              value={settings.webhookUrl}
              onChange={event => setSettings(settings => ({ ...settings, webhookUrl: event.nativeEvent.text }))}
            />
          </View>
          <TextInfo>This URL will be used to send the user input data.</TextInfo>
          {settings.webhookHistory.length > 0 && <MenuListHeadline>History</MenuListHeadline>}
          <MenuList
            style={{
            }}
          >
            { settings.webhookHistory.sort((a,b) => +new Date(b.date) - +new Date(a.date)).slice(0, 20).map((entry, index) => (
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
                    >{entry?.date ? dayjs(entry.date).format('DD.MM.YYYY HH:mm:ss') : '-'}</Text>
                    <Tag type={entry.isError ? 'error' : 'success'}>{entry.isError ? 'error' : 'success'}</Tag>
                  </View>
                }
                icon={<ChevronRight width={18} color={colors.menuListItemIcon} />}
                onPress={() => navigation.navigate('WebhookHistoryEntryScreen', { entry })}
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
