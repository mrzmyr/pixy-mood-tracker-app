import { Text, View } from 'react-native';
import useColors from '../../hooks/useColors';
import { useTranslation } from '../../hooks/useTranslation';
import { ColorDot } from './ColorDot';

export const ColorInput = ({
  value, onChange,
}) => {
  const colors = useColors();
  const { t } = useTranslation()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          marginRight: 16,
          flex: 2,
        }}
      >{t('color')}</Text>
      <View
        style={{
          flex: 10,
          flexDirection: 'row',
          flexWrap: 'wrap',
          margin: -4,
        }}
      >
        {Object.keys(colors.tags).map((colorName, index) => (
          <ColorDot
            key={colorName}
            isSelected={value === colorName}
            onPress={() => {
              onChange(colorName);
            }}
            color={colorName} />
        ))}
      </View>
    </View>
  );
};
