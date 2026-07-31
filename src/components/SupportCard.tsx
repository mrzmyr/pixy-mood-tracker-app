import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Heart } from 'react-native-feather';
import { t } from '@/helpers/translation';
import useColors from '@/hooks/useColors';
import { SupportFlowError, useSupport } from '@/support';

const isSupportFlowError = (error: unknown): error is SupportFlowError => {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as Partial<SupportFlowError>;
  return ['status', 'message', 'why', 'fix'].every(
    (field) => typeof candidate[field as keyof SupportFlowError] === 'string',
  );
};

const normalizeSupportFlowError = (error: unknown): SupportFlowError => {
  if (isSupportFlowError(error)) return error;

  return {
    status: 'support_flow_failed',
    message: t('support_pixy_error_message'),
    why: 'Support provider failed before returning a structured error.',
    fix: t('support_pixy_error_fix'),
  };
};

export const SupportCard = () => {
  const colors = useColors();
  const support = useSupport();
  const cardColor = colors.text;
  const contentColor = colors.background;
  const openingRef = useRef(false);
  const [isOpening, setIsOpening] = useState(false);

  const openSupport = async () => {
    if (openingRef.current) return;

    openingRef.current = true;
    setIsOpening(true);

    try {
      const outcome = await support.openSupport();

      if (outcome === 'purchased') {
        Alert.alert(
          t('support_pixy_thank_you_title'),
          t('support_pixy_thank_you_body'),
        );
      }
    } catch (cause) {
      const error = normalizeSupportFlowError(cause);

      Alert.alert(error.message, error.fix, [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('support_pixy_retry'),
          onPress: () => {
            void openSupport();
          },
        },
      ]);
    } finally {
      openingRef.current = false;
      setIsOpening(false);
    }
  };

  return (
    <View
      testID="support-pixy-card"
      style={{
        marginTop: 24,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        backgroundColor: cardColor,
      }}
    >
      <Heart
        width={28}
        height={28}
        color={contentColor}
        fill={contentColor}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        style={{
          marginTop: 28,
          color: contentColor,
          fontSize: 22,
          lineHeight: 28,
          fontWeight: '700',
          letterSpacing: -0.2,
        }}
      >
        {t('support_pixy_heading')}
      </Text>
      <Text
        style={{
          marginTop: 12,
          color: contentColor,
          fontSize: 17,
          lineHeight: 24,
        }}
      >
        {t('support_pixy_body')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('support_pixy_button')}
        accessibilityState={{ busy: isOpening, disabled: isOpening }}
        disabled={isOpening}
        onPress={() => {
          void openSupport();
        }}
        style={({ pressed }) => ({
          minHeight: 52,
          marginTop: 24,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: contentColor,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        {isOpening ? (
          <ActivityIndicator color={cardColor} size="small" />
        ) : (
          <Text
            style={{
              color: cardColor,
              fontSize: 17,
              lineHeight: 22,
              fontWeight: '700',
            }}
          >
            {t('support_pixy_button')}
          </Text>
        )}
      </Pressable>
    </View>
  );
};
