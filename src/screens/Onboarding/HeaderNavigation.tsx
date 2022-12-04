import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'react-native-feather';
import { t } from '@/helpers/translation';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { HeaderPagination } from "./HeaderPagination";

export const HeaderNavigation = ({
  index,
  setIndex,
  onSkip,
}: {
  index: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
}) => {
  const haptics = useHaptics()
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 32,
        borderBottomColor: colors.onboardingBottomBorder,
        borderBottomWidth: 1,
      }}
    >
      <TouchableOpacity
        style={{
          padding: 16,
          marginLeft: -16,
        }}
        onPress={async () => {
          await haptics.selection()
          setIndex(index - 1)
        }}
      >
        <ArrowLeft
          width={24}
          height={24}
          color={colors.onboardingPaginationText}
        />
      </TouchableOpacity>
      <HeaderPagination index={index} />
      <TouchableOpacity
        onPress={() => setIndex(index + 1)}
        style={{
          paddingVertical: 16,
          paddingHorizontal: 16,
          marginRight: -16,
        }}
      >
        <Text
          style={{
            color: colors.onboardingPaginationText,
            fontSize: 17,
            fontWeight: '600',
          }}
          onPress={async () => {
            await haptics.selection()
            onSkip()
          }}
        >
          {t('onboarding_skip')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
