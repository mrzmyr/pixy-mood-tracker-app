import Indicator from '@/components/Indicator';
import { LoggerStep, STEP_OPTIONS } from '@/components/Logger/config';
import MenuList from '@/components/MenuList';
import MenuListItem from '@/components/MenuListItem';
import { PageWithHeaderLayout } from '@/components/PageWithHeaderLayout';
import { t } from '@/helpers/translation';
import { BedDouble } from 'lucide-react-native';
import { ReactElement } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Bell, FileText, Heart, MessageSquare, Sun, Tag } from 'react-native-feather';
import { RootStackScreenProps } from '../../types';
import useColors from '../hooks/useColors';
import { useSettings } from '../hooks/useSettings';

export const StepsScreen = ({ navigation }: RootStackScreenProps<'Steps'>) => {
  const colors = useColors()

  const ICONS_MAP: {
    [key in LoggerStep]: ReactElement;
  } = {
    'rating': <Sun width={20} height={20} stroke={colors.text} />,
    'message': <FileText width={20} height={20} color={colors.text} />,
    'sleep': <BedDouble size={20} color={colors.text} />,
    'tags': <Tag width={20} height={20} color={colors.text} />,
    'emotions': <Heart width={20} height={20} color={colors.text} />,
    'feedback': <MessageSquare width={20} height={20} color={colors.text} />,
    'reminder': <Bell width={20} height={20} color={colors.text} />,
  }

  const { settings, setSettings } = useSettings()

  return (
    <PageWithHeaderLayout style={{
      flex: 1,
      backgroundColor: colors.background,
    }}>
      <ScrollView
        style={{
          padding: 20,
          flex: 1,
        }}
      >
        <View
          style={{
            paddingTop: 0,
            paddingBottom: 0,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: colors.textSecondary,
            }}
          >{t('steps_introduction')}</Text>
        </View>
        <MenuList style={{ marginTop: 16, }}>
          {STEP_OPTIONS.map((option) => (
            <MenuListItem
              key={option}
              title={
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      color: colors.text,
                    }}
                  >{t(`logger_step_${option}`)}</Text>
                  {option === 'sleep' && (
                    <Indicator
                      colorName='purple'
                      style={{
                        marginLeft: 8,
                      }}
                    >{t('new')}</Indicator>
                  )}
                </View>

              }
              iconLeft={ICONS_MAP[option]}
              iconRight={option === 'rating' ? undefined : (
                <Switch
                  onValueChange={() => {
                    setSettings(settings => ({
                      ...settings,
                      steps: settings.steps.includes(option) ? settings.steps.filter(s => s !== option) : [...settings.steps, option] as LoggerStep[]
                    }))
                  }}
                  value={settings.steps.includes(option)}
                />
              )}
              isLast={option === STEP_OPTIONS[STEP_OPTIONS.length - 1]}
            />
          ))}
        </MenuList>
      </ScrollView>
    </PageWithHeaderLayout>
  );
}
