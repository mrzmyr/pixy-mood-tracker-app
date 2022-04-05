import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, Switch, View } from 'react-native';
import { Box, Download, Trash2, Upload } from 'react-native-feather';
import { Alert } from '../components/Alert';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import { LogsState, useLogs } from '../hooks/useLogs';
import { useSegment } from "../hooks/useSegment";
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { convertPixeltoPixyJSON, getJSONSchemaType } from '../lib/utils';
import { RootStackScreenProps } from '../types';

let openShareDialogAsync = async (uri: string) => {
  const i18n = useTranslation()
  if (!(await Sharing.isAvailableAsync())) {
    alert(i18n.t('export_failed_title'));
    return;
  }

  await Sharing.shareAsync(uri);
};

const exportState = async (state: LogsState) => {
  if(Platform.OS === 'web') {
    return Alert.alert('Not supported on web');
  }

  const filename = `pixel-tracker-${dayjs().format('YYYY-MM-DD')}.json`;
  await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + filename, JSON.stringify(state));
  openShareDialogAsync(FileSystem.documentDirectory + filename)
}

export default function DataScreen({ navigation }: RootStackScreenProps<'Data'>) {
  const { state, dispatch } = useLogs()
  const { resetSettings } = useSettings()
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()

  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false)

  useEffect(() => {
    const loadTracking = async () => {
      setIsTrackingEnabled(await segment.isEnabled())
    }
    loadTracking()
  }, [])

  const askToReset = () => {
    segment.track('data_reset_asked')
    if(Platform.OS === 'web') {
      resetSettings()
      dispatch({ type: 'reset' })
      return;
    }
    
    Alert.alert(
      i18n.t('reset_data_confirm_title'),
      i18n.t('reset_data_confirm_message'),
      [
        {
          text: i18n.t('reset'),
          onPress: () => {
            resetSettings()
            dispatch({ type: 'reset' })
            segment.track('data_reset_success')
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
          onPress: () =>  {
            segment.track('data_reset_cancel')
          },
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  }


  const importEntries = async () => {
    try {
      segment.track('data_import_start')
      
      const doc = await DocumentPicker.getDocumentAsync({ 
        type: "application/json", 
        copyToCacheDirectory: true
      });

      if(doc.type === 'success') {
        segment.track('data_import_success')
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
      segment.track('data_import_error')
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
          onPress={() => {
            segment.track('data_export_started')
            exportState(state)
          }}
          iconLeft={<Download width={18} color={colors.menuListItemIcon} />}
          isLast
        />
      </MenuList>
      <TextInfo>{i18n.t('export_help')}</TextInfo>
      <MenuList>
        <MenuListItem
          title={i18n.t('behavioral_data')}
          iconRight={
            <Switch
              ios_backgroundColor={colors.backgroundSecondary}
              onValueChange={() => {
                segment.track('data_behavioral_toggle', { enabled: !isTrackingEnabled })
                setIsTrackingEnabled(!isTrackingEnabled)
                segment.disable()
              }}
              value={isTrackingEnabled}
              testID={`behavioral-data-enabled`}
            />
          }
          isLast
        ></MenuListItem>
      </MenuList>
      <MenuList style={{ marginTop: 20, }}>
        <MenuListItem
          testID='reset-data'
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
