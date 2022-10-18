import { usePostHog } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { Box, Download, Trash, Trash2, Upload } from 'react-native-feather';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import TextInfo from '../components/TextInfo';
import { useAnalytics } from "../hooks/useAnalytics";
import useColors from '../hooks/useColors';
import { useDatagate } from '../hooks/useDatagate';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackScreenProps } from '../types';

export const DataScreen = ({ navigation }: RootStackScreenProps<'Data'>) => {
  const colors = useColors()
  const i18n = useTranslation()
  const analytics = useAnalytics()
  const datagate = useDatagate()

  return (
    <View style={{ 
      flex: 1,
      backgroundColor: colors.background,
    }}>
      <ScrollView
        style={{
          padding: 20,
          flex: 1,
        }}
      >
      <MenuList style={{ marginTop: 16, }}>
        <MenuListItem
          title={i18n.t('import')}
          onPress={() => datagate.openImportDialog()}
          iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
        />
        {__DEV__ && (
          <MenuListItem
            title={'Dangerously Import Directly To AsyncStorage'}
            onPress={() => datagate.openDangerousImportDirectlyToAsyncStorageDialog()}
            iconLeft={<Upload width={18} color={colors.menuListItemIcon} />}
          />
        )}
        <MenuListItem
          title={i18n.t('export')}
          onPress={() => datagate.openExportDialog()}
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
                analytics.track('analytics_toggle', { enabled: !analytics.isEnabled })
                if(!analytics.isEnabled) {
                  analytics.enable()
                } else {
                  analytics.disable()
                }
              }}
              value={analytics.isEnabled}
              testID={`behavioral-data-enabled`}
            />
          }
          isLast
        />
      </MenuList>
      <MenuList style={{ marginTop: 16, }}>
        <MenuListItem
          testID='reset-data'
          title={i18n.t('reset_data_button')}
          onPress={() => {
            datagate
              .openResetDialog('data')
              .catch((e) => console.log(e))
          }}
          iconLeft={<Trash width={18} color='red' />}
          style={{
            color: 'red'
          }}
        />
        <MenuListItem
          testID='reset-factory'
          title={i18n.t('reset_factory_button')}
          onPress={() => {
            datagate
              .openResetDialog('factory')
              .catch((e) => console.log(e))
          }}
          iconLeft={<Trash width={18} color='red' />}
          style={{
            color: 'red'
          }}
          isLast
        />
      </MenuList>
      <TextInfo>{i18n.t('reset_factory_description')}</TextInfo>
    </ScrollView>
  </View>
  );
}
