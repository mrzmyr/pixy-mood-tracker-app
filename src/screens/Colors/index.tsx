import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import MenuList from '@/components/MenuList';
import MenuListHeadline from '@/components/MenuListHeadline';
import MenuListItem from '@/components/MenuListItem';
import TextInfo from '@/components/TextInfo';
import { t } from '@/helpers/translation';
import { useAnalytics } from '../../hooks/useAnalytics';
import useColors from '../../hooks/useColors';
import { useSettings } from '../../hooks/useSettings';
import { Radio } from './Radio';
import { Scale } from './Scale';
import { PageWithHeaderLayout } from '@/components/PageWithHeaderLayout';

export const ColorsScreen = ({ navigation }) => {
  const { setSettings, settings } = useSettings()
  const colors = useColors()
  const analytics = useAnalytics()

  const [scaleType, setScaleType] = useState(settings.scaleType)

  const typesNames = [{
    id: `ColorBrew-RdYlGn`,
    disabled: false,
  }, {
    id: `ColorBrew-PuOr`,
    disabled: true,
  }, {
    id: `ColorBrew-BrBG`,
    disabled: true,
  }, {
    id: `ColorBrew-RdYG`,
    disabled: false,
  }, {
    id: `ColorBrew-RdYlGn-old`,
    disabled: false,
  }]

  useEffect(() => {
    setSettings(settings => ({ ...settings, scaleType }))
    analytics.track('colors_scale_changed', { scaleType })
  }, [scaleType])

  const onSelect = useCallback((id) => {
    setScaleType(id)
  }, [])

  return (
    <PageWithHeaderLayout style={{
      flex: 1,
      backgroundColor: colors.background,
    }}>
      <ScrollView
        style={{
          padding: 20,
        }}
      >
        {typesNames.filter(d => !d.disabled).map(type => (
          <>
            <Radio
              key={type.id}
              isSelected={type.id === scaleType}
              onPress={() => onSelect(type.id)}
              isDisabled={type.disabled}
            >
              <Scale type={type.id} />
            </Radio>
            {type.id === 'ColorBrew-RdYlGn-old' && (
              <TextInfo
                style={{
                  marginTop: 0,
                }}
              >{t('colorblind_disclaimer')}</TextInfo>
            )}
          </>
        )
        )}
        <MenuListHeadline>Coming Soon…</MenuListHeadline>
        <View
          style={{
          }}
        >
          {typesNames.filter(d => d.disabled).map(type => (
            <Radio
              key={type.id}
              isSelected={type.id === scaleType}
              onPress={() => onSelect(type.id)}
              isDisabled={type.disabled}
            >
              <Scale type={type.id} />
            </Radio>
          ))}
        </View>
        <View
          style={{
            marginBottom: 8,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
        </View>
      </ScrollView>
    </PageWithHeaderLayout>
  );
}
