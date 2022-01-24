import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Circle } from 'react-native-feather';
import Scale from '../components/Scale';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';

function Radio({
  onPress,
  children,
  isSelected = false,
}: {
  onPress: () => void;
  children: React.ReactNode;
  isSelected?: boolean;
}) {
  const colors = useColors()
  
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: colors.menuListItemBackground,
        padding: 10,
        borderRadius: 10,
      }}
    >
      <View style={{ 
        width: '15%', 
        justifyContent: 'center', 
        flexDirection: 'row',
        position: 'relative',
      }}>
        <Circle width={24} color={colors.text} />
        {isSelected && 
          <View style={{ 
            width: 10, 
            height: 10, 
            backgroundColor: colors.text,
            position: 'absolute',
            borderRadius: 100,
            top: 7
          }}></View>
        }
      </View>
      <View
        style={{
          flex: 1,
        }}
      >
        {children}
      </View>
    </Pressable>
  )
}

export default function SettingsScreen({ navigation }) {
  const { setSettings, settings } = useSettings()
  const i18n = useTranslation()
  const colors = useColors()
  
  const [scaleType, setScaleType] = useState(settings.scaleType)
  
  const typesNames = [
    `ColorBrew-RdYlGn`,
    `ColorBrew-PiYG`,
  ]

  useEffect(() => {
    setSettings(settings => ({  ...settings, scaleType }))
  }, [scaleType])

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
        {typesNames.map(type => (
            <Radio
              key={type}
              isSelected={type === scaleType}
              onPress={() => setScaleType(type)}
            >
              <Scale type={type} />
            </Radio>
          )
        )}
        <View
          style={{
            marginBottom: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TextInfo>{i18n.t('scales_info')}</TextInfo>
        </View>
      </ScrollView>
    </View>
  );
}
