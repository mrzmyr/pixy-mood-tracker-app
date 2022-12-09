import { View } from 'react-native';
import Scale from '@/components/Scale';
import TextHeadline from '@/components/TextHeadline';
import { t } from '@/helpers/translation';
import { LogItem } from '../../../hooks/useLogs';
import { useSettings } from '../../../hooks/useSettings';

export const RatingSection = ({
  value,
  onChange,
}: {
  value: LogItem['rating'][];
  onChange: (value: LogItem['rating']) => void;
}) => {
  const { settings } = useSettings();

  return (
    <View
      style={{
        marginBottom: 16,
      }}
    >
      <TextHeadline style={{ marginBottom: 12 }}>{t('mood')}</TextHeadline>
      <Scale value={value} onPress={onChange} type={settings.scaleType} />
    </View>
  );
};
