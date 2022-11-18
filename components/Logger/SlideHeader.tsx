import { Pressable, Text, View } from 'react-native';
import { Trash, X } from 'react-native-feather';
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";

export const SlideHeader = ({
  title,
  isDeleteable,
  onClose,
  onDelete,
}: {
  title: string;
  isDeleteable: boolean;
  onClose?: () => void;
  onDelete?: () => void;
}) => {
  const haptics = useHaptics();
  const colors = useColors()

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: -16,
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
              color: colors.logHeaderText,
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
          }}
        >
          {isDeleteable && (
            <Pressable
              style={{
                marginRight: 8,
                padding: 8,
              }}
              onPress={async () => {
                await haptics.selection()
                onDelete?.()
              }}
            >
              <Trash color={colors.logHeaderText} width={24} height={24} />
            </Pressable>
          )}
          <Pressable
            style={{
              padding: 8,
            }}
            onPress={async () => {
              await haptics.selection()
              onClose?.()
            }}
          >
            <X color={colors.logHeaderText} width={24} height={24} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};
