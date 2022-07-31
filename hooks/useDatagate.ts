import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { convertPixeltoPixyJSON, getJSONSchemaType } from '../lib/utils';
import { LogsState, useLogs } from './useLogs';
import { useSegment } from './useSegment';
import { SettingsState, useSettings } from './useSettings';
import { useTranslation } from './useTranslation';

let openShareDialogAsync = async (uri: string) => {
  const i18n = useTranslation()
  if (!(await Sharing.isAvailableAsync())) {
    alert(i18n.t('export_failed_title'));
    return;
  }

  await Sharing.shareAsync(uri);
};

export const useDatagate = () => {
  const { state, dispatch } = useLogs()
  const { t } = useTranslation()
  const { resetSettings, setSettings, settings } = useSettings()

  const segment = useSegment() 
  
  const _import = (data: {
    items: LogsState['items'],
    settings: SettingsState,
  }) => {
    dispatch({
      type: 'import',
      payload: {
        items: data.items
      },
    })
    setSettings(data.settings)
  }
  
  const askToImport = () => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        t('import_confirm_title'),
        t('import_confirm_message'),
        [
          {
            text: t('import_confirm_ok'),
            onPress: () => resolve({}),
            style: "destructive"
          },
          { 
            text: t('cancel'), 
            onPress: () => reject(),
            style: "cancel"
          }
        ],
        { cancelable: true }
      );
    })
  }
  
  const openImportDialog = async () => {
    return new Promise(async (resolve, reject) => {
      askToImport()
      .then(async () => {
        try {
          segment.track('data_import_start')

          const doc = await DocumentPicker.getDocumentAsync({ 
            type: "application/json", 
            copyToCacheDirectory: true
          });

          if(doc.type === 'success') {
            segment.track('data_import_success')
            const contents = await FileSystem.readAsStringAsync(doc.uri);
            const data = JSON.parse(contents);
            
            const jsonSchemaType = getJSONSchemaType(data);

            if(jsonSchemaType === 'pixy') {
              Alert.alert(
                t('import_success_title'),
                t('import_success_message'),
                [
                  {
                    text: t('ok'),
                  },
                ],
                { cancelable: false },
              );
              _import(data)
              resolve(data)
            } else {
              segment.track('data_import_error', {
                reason: 'invalid_json_schema',
              })
              Alert.alert(
                t('import_error_title'),
                t('import_error_message'),
                [
                  { text: t('ok'), onPress: () => {} }
                ],
                { cancelable: false }
              )
              reject()
            }
          }
        } catch (error) {
          segment.track('data_import_error', {
            reason: 'document_picker_error'
          })
          console.error(error)
          Alert.alert(
            t('import_error_title'),
            t('import_error_message'),
            [
              { text: t('ok'), onPress: () => {} }
            ],
            { cancelable: false }
          )
          reject()
        }
      })
    })
  }

  const resetData = () => {
    resetSettings()
    dispatch({ type: 'reset' })
  }
  
  const openResetDialog = () => {
    segment.track('data_reset_asked')
    if(Platform.OS === 'web') {
      resetData()
      alert(t('reset_data_success_message'))
      return;
    }
    
    Alert.alert(
      t('reset_data_confirm_title'),
      t('reset_data_confirm_message'),
      [
        {
          text: t('reset'),
          onPress: () => {
            resetData()
            segment.track('data_reset_success')
            Alert.alert(
              t('reset_data_success_title'),
              t('reset_data_success_message'),
              [{ 
                text: t('ok'), 
                onPress: () => {} 
              }],
              { cancelable: false }
            )
          },
          style: "destructive"
        },
        { 
          text: t('cancel'), 
          onPress: () =>  {
            segment.track('data_reset_cancel')
          },
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  }
  
  const openExportDialog = async () => {
    const data = {
      items: state.items,
      settings: {
        ...settings,
        deviceId: undefined,
      },
    }

    console.log(data)
    
    segment.track('data_export_started')

    if(Platform.OS === 'web') {
      return Alert.alert('Not supported on web');
    }
  
    const filename = `pixel-tracker-${dayjs().format('YYYY-MM-DD')}.json`;
    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + filename, JSON.stringify(data));
    return openShareDialogAsync(FileSystem.documentDirectory + filename)
  }
  
  return {
    openExportDialog,
    openImportDialog,
    openResetDialog,
  }
}