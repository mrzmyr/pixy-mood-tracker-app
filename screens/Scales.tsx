import { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Circle } from 'react-native-feather';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import useHaptics from '../hooks/useHaptics';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';

function ColorDot({
  color,
}: {
  color: string;
}) {
  return (
    <View
      style={{
        padding: 3,
        backgroundColor: color,
        flex: 1,
        borderRadius: 8,
        width: '100%',
        aspectRatio: 1,
        margin: 5,
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: 50,
      }}
    />
  )
}

function Scale({
  type,
}: {
  type: string;
}) {
  const colors = useColors();
  const scaleColors = colors.scales[type];
  
  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {Object.keys(scaleColors).reverse().map((key, index) => (
        <ColorDot 
          key={key} 
          color={scaleColors[key].background}
        />
      ))}
    </View>
  )
}

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
    <TouchableOpacity
      activeOpacity={0.8}
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
      <>
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
      </>
    </TouchableOpacity>
  )
}

export const ScaleScreen = ({ navigation }) => {
  const { setSettings, settings } = useSettings()
  const i18n = useTranslation()
  const colors = useColors()
  const haptics = useHaptics()
  
  const [scaleType, setScaleType] = useState(settings.scaleType)
  
  const typesNames = [
    `ColorBrew-RdYlGn`,
    `ColorBrew-PiYG`,
    'ColorBrew-BrBG',
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
