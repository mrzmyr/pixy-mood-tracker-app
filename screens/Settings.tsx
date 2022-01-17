import dayjs from 'dayjs';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as StoreReview from 'expo-store-review';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Award, Box, Download, Lock, Menu, Star, Trash2, Upload } from 'react-native-feather';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import { useLogs } from '../hooks/useLogs';
import { useSettings } from '../hooks/useSettings';
import { convertPixeltoPixyJSON, getJSONSchemaType } from '../lib/utils';
import pkg from '../package.json';

let openShareDialogAsync = async (uri) => {
  if (!(await Sharing.isAvailableAsync())) {
    alert(`Uh oh, sharing isn't available on your platform`);
    return;
  }

  await Sharing.shareAsync(uri);
}; 

export default function SettingsScreen({ navigation }) {
  const { state: logs, dispatch } = useLogs()
  const { resetSettings } = useSettings()
  const colors = useColors()

  const exportEntries = async (items) => {
    const filename = `pixel-tracker-${dayjs().format('YYYY-MM-DD')}.json`;
    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + filename, JSON.stringify(items));
    openShareDialogAsync(FileSystem.documentDirectory + filename)
  }

  const importEntries = async () => {
    const doc = await DocumentPicker.getDocumentAsync({ 
      type: "application/json", 
      copyToCacheDirectory: true
    });
    const contents = await FileSystem.readAsStringAsync(doc.uri);
    const json = JSON.parse(contents);
    
    const jsonSchemaType = getJSONSchemaType(json);
    
    if(jsonSchemaType === 'pixy') {
      console.log('import pixy type')
      dispatch({
        type: 'import',
        payload: json
      })
    } else if(jsonSchemaType === 'pixel') {
      const payload = convertPixeltoPixyJSON(json);
      console.log('import pixel type', payload)
      dispatch({
        type: 'import',
        payload: payload
      })
    }

    if(['pixy', 'pixel'].includes(jsonSchemaType)) {
      Alert.alert(
        'Import Successful',
        `Your data from ${jsonSchemaType} App has been imported successfully.`,
        [
          {
            text: 'OK',
            style: 'cancel',
          },
        ],
        { cancelable: false },
      );
    } else {
      Alert.alert(
        'Invalid JSON',
        'The JSON you selected does not contain the correct format.',
        [
          { text: 'OK', onPress: () => {} }
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
      'Reset Logs and Settings',
      'This will reset all logs and settings.',
      [
        {
          text: 'Reset',
          onPress: () => {
            resetSettings()
            dispatch({ type: 'reset' })
            Alert.alert(
              'Reset Successful',
              'All logs and settings have been reset.',
              [
                { text: 'OK', onPress: () => {} }
              ],
              { cancelable: false }
            )
          },
          style: "destructive"
        },
        { 
          text: 'Cancel', 
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
              opacity: 0.5,
              width: '90%',
            }}
          >
            <Lock width={18} color={colors.text} />
            <Text style={{ color: colors.text, marginTop: 5, textAlign: 'center' }}>
              All data is stored on your device and only leaves your device when you decide to to so.
            </Text>
          </View>
        </View>
        
        <MenuList
          style={{
          }}
        >
          <MenuListItem
            title='Webbook'
            iconLeft={<Box width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('WebhookScreen')}
            isLink
            isLast
          />
        </MenuList>
        <MenuList style={{ marginTop: 20, }}>
          <MenuListItem
            title='Import'
            onPress={importEntries}
            iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
          />
          <MenuListItem
            title='Export'
            onPress={() => exportEntries(logs)}
            iconLeft={<Download width={18} color={colors.menuListItemIcon} />}
            isLast
          />
        </MenuList>
        <TextInfo>Export all ratings with messages as a JSON file.</TextInfo>
        <MenuList
          style={{
            marginTop: 20,
          }}
        >
          <MenuListItem
            title='License'
            iconLeft={<Award width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('LicenseScreen')}
            isLink
          />
          <MenuListItem
            title='Rate this app'
            onPress={() => askToRateApp()}
            iconLeft={<Star width={18} color={colors.menuListItemIcon} />}
            isLast
          />
        </MenuList>

        <MenuList style={{ marginTop: 20, }}>
          <MenuListItem
            title='Reset all data & settings'
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
          <Text style={{ fontSize: 14, marginTop: 5, marginBottom: 40, color: colors.settingsText }}>{pkg.name} v{pkg.version}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
