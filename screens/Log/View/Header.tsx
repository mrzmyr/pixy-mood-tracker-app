import { View } from 'react-native';
import useColors from '../../../hooks/useColors';
import { Pressable, Text } from 'react-native';
import { Edit, Trash, X } from 'react-native-feather';
import useHaptics from '../../../hooks/useHaptics';

export const Header = ({
  title, onClose, onDelete, onEdit,
}: {
  title: string;
  onClose?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) => {
  const haptics = useHaptics();
  const colors = useColors();

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
    }}>
      <View
        style={{
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: colors.text,
            }}
          >{title}</Text>
        </View>
      </View>
      <View
        style={{
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            marginRight: -8,
          }}
        >
          <Pressable
            style={{
              padding: 16,
            }}
            onPress={async () => {
              await haptics.selection();
              onEdit();
            }}
          >
            <Edit color={colors.logHeaderText} width={24} height={24} />
          </Pressable>
          <Pressable
            style={{
              padding: 16,
            }}
            onPress={async () => {
              await haptics.selection();
              onDelete();
            }}
          >
            <Trash color={colors.logHeaderText} width={24} height={24} />
          </Pressable>
          <Pressable
            style={{
              padding: 16,
            }}
            onPress={async () => {
              await haptics.selection();
              onClose();
            }}
          >
            <X color={colors.logHeaderText} width={24} height={24} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};
