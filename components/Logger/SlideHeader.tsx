import { Pressable, Text, View } from 'react-native';
import { Clock, Edit, Edit2, Edit3, Trash, X } from 'react-native-feather';
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";

export const SlideHeader = ({
  title,
  isDeleteable,
  onPressTitle,
  onClose,
  onDelete,
}: {
  title: React.ReactNode;
  isDeleteable: boolean;
  onPressTitle?: () => void;
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
      marginTop: -8,
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
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={() => {
              haptics.selection();
              onPressTitle?.();
            }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              flexDirection: 'row',
              alignItems: 'center',
            })}
          >
            <Clock color={colors.logHeaderText} width={17} style={{ marginRight: 8 }} />
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: colors.logHeaderText,
              }}
            >{title}</Text>
          </Pressable>
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
