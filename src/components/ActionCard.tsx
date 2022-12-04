import { Text, View, ViewStyle } from 'react-native';
import useColors from '@/hooks/useColors';

export const ActionCard = ({
  title, subtitle, icon, style,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <View
          style={{}}
        >
          {icon}
        </View>
        <View
          style={{
            marginLeft: 8,
          }}
        >
          <Text style={{
            fontSize: 20,
            color: colors.text,
            marginBottom: 4,
            fontWeight: 'bold'
          }}>{title}</Text>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: 'bold',
          }}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
};
