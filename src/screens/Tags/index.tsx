import { RootStackScreenProps } from '../../../types';
import useColors from '../../hooks/useColors';
import { Tag, useTagsState } from '../../hooks/useTags';
import Button from '@/components/Button';
import LinkButton from '@/components/LinkButton';
import ModalHeader from '@/components/ModalHeader';
import { TagList } from '@/components/TagList';
import { MAX_TAGS } from '@/constants/Config';
import { t } from '@/helpers/translation';
import { LinearGradient } from 'expo-linear-gradient';
import _ from 'lodash';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const Tags = ({ navigation }: RootStackScreenProps<'Tags'>) => {
  const colors = useColors()
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState()

  const _tags = tags.filter((tag: Tag) => !tag.isArchived)

  return (
    <View style={{
      flex: 1,
      justifyContent: 'flex-start',
      backgroundColor: colors.background,
      marginTop: Platform.OS === 'android' ? insets.top : 0,
    }}>
      <ModalHeader
        title={t('tags')}
        right={
          <LinkButton
            onPress={() => {
              navigation.goBack();
            }}
            type='primary'
          >{t('done')}</LinkButton>
        }
      />
      {
        tags.length < MAX_TAGS && (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={[colors.logBackgroundTransparent, colors.background, colors.background]}
              style={{
                position: 'absolute',
                height: 120 + insets.bottom,
                bottom: 0,
                zIndex: 1,
                width: '100%',
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 16,
                position: 'absolute',
                bottom: insets.bottom + 16,
                width: '100%',
                zIndex: 2,
              }}
            >
              <Button
                style={{
                  marginTop: 16,
                  width: '100%',
                }}
                onPress={() => {
                  navigation.navigate('TagCreate')
                }}
              >{t('create_tag')}</Button>
            </View>
          </>
        )
      }
      <ScrollView
        style={{
          flex: 1,
        }}
      >
        <TagList tags={_tags} />
        <View
          style={{
            width: '100%',
            height: insets.bottom + 56,
          }}
        />
      </ScrollView>
    </View>
  );
}
