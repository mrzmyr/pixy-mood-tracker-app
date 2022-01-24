import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as StoreReview from 'expo-store-review';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Award, Box, Download, Grid, Lock, Star, Trash2, Upload } from 'react-native-feather';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import { useLogs } from '../hooks/useLogs';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { convertPixeltoPixyJSON, getJSONSchemaType } from '../lib/utils';
import pkg from '../package.json';

let openShareDialogAsync = async (uri) => {
  const i18n = useTranslation()
  if (!(await Sharing.isAvailableAsync())) {
    alert(i18n.t('export_failed_title'));
    return;
  }

  await Sharing.shareAsync(uri);
}; 

export default function SettingsScreen({ navigation }) {
  const { state: logs, dispatch } = useLogs()
  const { resetSettings } = useSettings()
  const colors = useColors()

  const i18n = useTranslation()

  const exportEntries = async (items) => {
    const filename = `pixel-tracker-${dayjs().format('YYYY-MM-DD')}.json`;
    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + filename, JSON.stringify(items));
    openShareDialogAsync(FileSystem.documentDirectory + filename)
  }

  const importEntries = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({ 
        type: "application/json", 
        copyToCacheDirectory: true
      });

      if(doc.type === 'success') {
        const contents = await FileSystem.readAsStringAsync(doc.uri);
        const json = JSON.parse(contents);
        
        const jsonSchemaType = getJSONSchemaType(json);
        
        if(jsonSchemaType === 'pixy') {
          dispatch({
            type: 'import',
            payload: json
          })
        } else if(jsonSchemaType === 'pixel') {
          const payload = convertPixeltoPixyJSON(json);
          dispatch({
            type: 'import',
            payload: payload
          })
        }

        if(['pixy', 'pixel'].includes(jsonSchemaType)) {
          Alert.alert(
            i18n.t('import_success_title'),
            i18n.t('import_success_message'),
            [
              {
                text: i18n.t('ok'),
                style: i18n.t('cancel'),
              },
            ],
            { cancelable: false },
          );
        } else {
          Alert.alert(
            i18n.t('import_error_title'),
            i18n.t('import_error_message'),
            [
              { text: i18n.t('ok'), onPress: () => {} }
            ],
            { cancelable: false }
          )
        }
      }
    } catch (error) {
      console.error(error)
      Alert.alert(
        i18n.t('import_error_title'),
        i18n.t('import_error_message'),
        [
          { text: i18n.t('ok'), onPress: () => {} }
        ],
        { cancelable: false }
      )
    }
  }

  const askToRateApp = async () => {
    if (await StoreReview.hasAction()) {
      StoreReview.requestReview()
    }
  }
  
  const askToReset = () => {
    Alert.alert(
      i18n.t('reset_data_confirm_title'),
      i18n.t('reset_data_confirm_message'),
      [
        {
          text: i18n.t('reset'),
          onPress: () => {
            resetSettings()
            dispatch({ type: 'reset' })
            Alert.alert(
              i18n.t('reset_data_success_title'),
              i18n.t('reset_data_success_message'),
              [{ 
                text: i18n.t('ok'), 
                onPress: () => {} 
              }],
              { cancelable: false }
            )
          },
          style: "destructive"
        },
        { 
          text: i18n.t('cancel'), 
          onPress: () =>  {},
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  }

  return (
    <View style={{ 
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    }}>
      <ScrollView
      style={{
        padding: 20,
      }}
      >
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              marginTop: 10,
              marginBottom: 20,
              width: '90%',
            }}
          >
            <Lock width={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 5, textAlign: 'center' }}>
              {i18n.t('data_notice')}
            </Text>
          </View>
        </View>
        
        <MenuList
          style={{
          }}
        >
          <MenuListItem
            title={i18n.t('webhook')}
            iconLeft={<Box width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('WebhookScreen')}
            isLink
          />
          {/* <MenuListItem
            title={i18n.t('scales')}
            iconLeft={<Grid width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('ScalesScreen')}
            isLink
            isLast
          /> */}
        </MenuList>
        <MenuList style={{ marginTop: 20, }}>
          <MenuListItem
            title={i18n.t('import')}
            onPress={importEntries}
            iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
          />
          <MenuListItem
            title={i18n.t('export')}
            onPress={() => exportEntries(logs)}
            iconLeft={<Download width={18} color={colors.menuListItemIcon} />}
            isLast
          />
        </MenuList>
        <TextInfo>{i18n.t('export_help')}</TextInfo>
        <MenuList
          style={{
            marginTop: 20,
          }}
        >
          <MenuListItem
            title={i18n.t('licenses')}
            iconLeft={<Award width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('LicenseScreen')}
            isLink
          />
          <MenuListItem
            title={i18n.t('rate_this_app')}
            onPress={() => askToRateApp()}
            iconLeft={<Star width={18} color={colors.menuListItemIcon} />}
            isLast
          />
        </MenuList>

        <MenuList style={{ marginTop: 20, }}>
          <MenuListItem
            title={i18n.t('reset_data_button')}
            onPress={() => askToReset()}
            iconLeft={<Trash2 width={18} color='red' />}
            style={{
              color: 'red'
            }}
            isLast
          />
        </MenuList>

        <View
          style={{
            marginTop: 20,
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, marginTop: 5, marginBottom: 40, color: colors.textSecondary }}>{pkg.name} v{pkg.version}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
