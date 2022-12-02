import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Tag from "../../Tag";
import { getLogEditMarginTop } from "../../../helpers/responsive";
import { t } from "../../../helpers/translation";
import useColors from "../../../hooks/useColors";
import { useSettings } from "../../../hooks/useSettings";
import { TagReference, useTagsState } from "../../../hooks/useTags";
import { useTemporaryLog } from "../../../hooks/useTemporaryLog";
import LinkButton from "../../LinkButton";
import { MiniButton } from "../../MiniButton";
import { SlideHeadline } from "../components/SlideHeadline";
import { useLogState } from "../../../hooks/useLogs";

export const SlideTags = ({
  onChange,
  onDisableStep,
  showDisable,
}: {
  onChange: (tags: TagReference[]) => void,
  onDisableStep: () => void
  showDisable: boolean
}) => {
  const tempLog = useTemporaryLog();
  const navigation = useNavigation()
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const { tags } = useTagsState()
  const logState = useLogState()

  const marginTop = getLogEditMarginTop()

  return (
    <View style={{
      flex: 1,
      width: '100%',
      paddingHorizontal: 20,
      paddingBottom: 20,
      marginTop,
    }}>
      <View
        style={{
          width: '100%',
          marginBottom: 8,
        }}
      >
        <SlideHeadline>{t('log_tags_question')}</SlideHeadline>
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.logBackground, colors.logBackgroundTransparent]}
        style={{
          position: 'absolute',
          height: 24,
          top: 32,
          zIndex: 1,
          width: '100%',
        }}
      />
      <LinearGradient
        colors={[colors.logBackgroundTransparent, colors.logBackground]}
        style={{
          position: 'absolute',
          height: 32,
          bottom: insets.bottom + 54 + 16,
          zIndex: 1,
          width: '100%',
        }}
        pointerEvents="none"
      />
      <ScrollView
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            marginTop: 16,
            paddingBottom: insets.bottom,
          }}
        >
          {tags?.map(tag => {
            const _tag = tags.find(t => t.id === tag.id)
            if (!_tag) return null;

            return (
              <Tag
                onPress={async () => {
                  const newTags = tempLog?.data?.tags?.map(d => d.id).includes(tag.id) ?
                    tempLog?.data?.tags.filter(t => t.id !== tag.id) :
                    [...tempLog?.data.tags || [], tag]
                  onChange(newTags)
                }}
                title={_tag.title}
                colorName={_tag.color}
                selected={tempLog?.data?.tags?.map(d => d.id).includes(tag.id)}
                key={tag.id}
              />
            )
          })}
          <View>
            <MiniButton
              onPress={() => {
                navigation.navigate('Tags')
              }}
            >{t('tags_edit')}</MiniButton>
          </View>
        </View>
      </ScrollView>
      {showDisable && (
        <View
          style={{
            height: 54,
            marginTop: 16,
            marginBottom: insets.bottom,
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <LinkButton
            type="secondary"
            onPress={onDisableStep}
          >{t('log_tags_disable')}</LinkButton>
        </View>
      )}
    </View>
  )
}