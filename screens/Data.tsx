import { Alert, ScrollView, Text, View } from 'react-native';
import { Box, Download, Trash2, Upload } from 'react-native-feather';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import useColors from '../hooks/useColors';
import { LogsState, useLogs } from '../hooks/useLogs';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { convertPixeltoPixyJSON, getJSONSchemaType } from '../lib/utils';
import { RootStackScreenProps } from '../types';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import dayjs from 'dayjs';
import TextInfo from '../components/TextInfo';

let openShareDialogAsync = async (uri: string) => {
  const i18n = useTranslation()
  if (!(await Sharing.isAvailableAsync())) {
    alert(i18n.t('export_failed_title'));
    return;
  }

  await Sharing.shareAsync(uri);
};

const exportState = async (state: LogsState) => {
  const filename = `pixel-tracker-${dayjs().format('YYYY-MM-DD')}.json`;
  await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + filename, JSON.stringify(state));
  openShareDialogAsync(FileSystem.documentDirectory + filename)
}

export default function DataScreen({ navigation }: RootStackScreenProps<'Data'>) {
  const { state, dispatch } = useLogs()
  const { resetSettings } = useSettings()
  const colors = useColors()
  const i18n = useTranslation()

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
      <MenuList style={{ marginTop: 20, }}>
        <MenuListItem
          title={i18n.t('webhook')}
          iconLeft={<Box width={18} color={colors.menuListItemIcon} />}
          onPress={() => navigation.navigate('Webhook')}
          testID='webhook'
          isLink
          isLast
        />
        {/* <MenuListItem
          title={i18n.t('scales')}
          iconLeft={<Droplet width={18} color={colors.menuListItemIcon} />}
          onPress={() => navigation.navigate('Scales')}
          isLink
          isLast
        /> */}
      </MenuList>
      <TextInfo>{i18n.t('webhook_help')}</TextInfo>
      <MenuList style={{ marginTop: 20, }}>
        <MenuListItem
          title={i18n.t('import')}
          onPress={importEntries}
          iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
        />
        <MenuListItem
          title={i18n.t('export')}
          onPress={() => exportState(state)}
          iconLeft={<Download width={18} color={colors.menuListItemIcon} />}
          isLast
        />
      </MenuList>
      <TextInfo>{i18n.t('export_help')}</TextInfo>
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
    </ScrollView>
  </View>
  );
}
