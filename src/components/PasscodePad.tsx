import { View } from 'react-native';
import { Delete, X } from 'react-native-feather';
import { PasscodeEmptyPad } from '@/components/PasscodeEmptyPad';
import useColors from '@/hooks/useColors';
import { PasscodePadButton } from './PasscodePadButton';
import { PasscodePadIcon } from './PasscodePadIcon';

export const PasscodePad = ({
  onPress,
  onBackspace,
  onClose,
  mode,
}: {
  onPress: (value: string) => void;
  onBackspace: () => void;
  onClose: () => void;
  mode: 'create' | 'confirm';
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: '10%',
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 320,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: '5%',
          }}
        >
          <PasscodePadButton value="1" onPress={onPress} />
          <PasscodePadButton value="2" onPress={onPress} />
          <PasscodePadButton value="3" onPress={onPress} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: '5%',
          }}
        >
          <PasscodePadButton value="4" onPress={onPress} />
          <PasscodePadButton value="5" onPress={onPress} />
          <PasscodePadButton value="6" onPress={onPress} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: '5%',
          }}
        >
          <PasscodePadButton value="7" onPress={onPress} />
          <PasscodePadButton value="8" onPress={onPress} />
          <PasscodePadButton value="9" onPress={onPress} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 25,
          }}
        >
          {mode !== 'confirm' ?
            <PasscodePadIcon icon={<X height={30} width={30} color={colors.text} />} onPress={onClose} />
            : <PasscodeEmptyPad />}
          <PasscodePadButton value="0" onPress={onPress} />
          <PasscodePadIcon icon={<Delete width={80} height={30} color={colors.text} />} onPress={onBackspace} />
        </View>
      </View>
    </View>
  );
};
