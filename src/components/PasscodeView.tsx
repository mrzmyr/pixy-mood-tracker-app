import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { t } from '@/helpers/translation';
import useColors from '@/hooks/useColors';
import LinkButton from './LinkButton';
import { PasscodeDots } from './PasscodeDots';
import { PasscodePad } from './PasscodePad';

export const PasscodeView = ({
  mode,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'confirm',
  onClose: () => void,
  onSubmit: (code: string) => boolean,
}) => {
  const [code, setCode] = useState('')
  const colors = useColors();

  const ref = useRef<View & {
    shake: () => void,
  }>(null);

  const bounce = () => {
    if (ref.current) {
      ref.current.shake();
    }
  };

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{
          fontSize: 24,
          color: colors.text,
          marginBottom: 20,
          fontWeight: 'bold'
        }}>{t(`passcode_title_${mode}`)}</Text>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <PasscodeDots ref={ref} code={code} />
        </View>
        <PasscodePad
          mode={mode}
          onClose={onClose}
          onBackspace={() => {
            setCode(code.slice(0, -1))
          }}
          onPress={(value) => {
            if (code.length >= 4) return;

            const newCode = code + value;
            setCode(newCode)
            if (newCode.length === 4) {
              // setTimeout bc we need to wait for 4th dot to show
              setTimeout(() => {
                const result = onSubmit(newCode)
                if (!result) {
                  setCode('')
                  bounce()
                }
              })
            }
          }}
        />
      </View>
      <View>
        <LinkButton
          onPress={() => {

          }}
          style={{
            fontSize: 15,
            color: colors.text,
            marginTop: 20,
            textAlign: 'center'
          }}>{t(`passcode_forgot`)}</LinkButton>
      </View>
    </View>
  );
};
