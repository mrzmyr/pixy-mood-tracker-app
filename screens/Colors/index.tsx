import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import TextInfo from '../../components/TextInfo';
import { useAnalytics } from '../../hooks/useAnalytics';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { Radio } from './Radio';
import { Scale } from './Scale';

export const ColorsScreen = ({ navigation }) => {
  const { setSettings, settings } = useSettings()
  const i18n = useTranslation()
  const colors = useColors()
  const haptics = useHaptics()
  const analytics = useAnalytics()
  
  const [scaleType, setScaleType] = useState(settings.scaleType)
  
  const typesNames = [
    `ColorBrew-RdYlGn`,
    `ColorBrew-RdYlGn-old`,
    `ColorBrew-PuOr`,
    // `ColorBrew-PiYG`,
    // 'ColorBrew-BrBG',
  ]

  useEffect(() => {
    setSettings(settings => ({  ...settings, scaleType }))
    analytics.track('colors_scale_changed', { scaleType })
  }, [scaleType])

  return (
    <View style={{ 
      flex: 1,
      backgroundColor: colors.background,
    }}>
      <ScrollView
      style={{
        padding: 20,
      }}
      >
        {typesNames.map(type => (
            <Radio
              key={type}
              isSelected={type === scaleType}
              onPress={async () => {
                await haptics.selection()
                setScaleType(type)
              }}
            >
              <Scale type={type} />
            </Radio>
          )
        )}
        <View
          style={{
            marginBottom: 8,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextInfo>{i18n.t('colors_info')}</TextInfo>
        </View>
      </ScrollView>
    </View>
  );
}
