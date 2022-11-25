import { Dimensions, Pressable, Text, View } from 'react-native';
import { Clock, Trash, X } from 'react-native-feather';
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";

const SCREEN_WIDTH = Dimensions.get('window').width;

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
      flexDirection: SCREEN_WIDTH < 350 ? 'column' : 'row',
      justifyContent: 'space-between',
      marginTop: -8,
      width: '100%',
    }}
    >
      <View
        style={{
          alignItems: 'flex-start',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
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
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: colors.logHeaderHighlight,
              borderRadius: 8,
            })}
          >
            <Clock color={colors.logHeaderText} width={17} style={{ marginRight: 8 }} />
            <Text
              numberOfLines={1}
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
