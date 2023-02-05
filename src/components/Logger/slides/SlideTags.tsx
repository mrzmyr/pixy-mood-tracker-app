import LinkButton from "../../LinkButton";
import { MiniButton } from "../../MiniButton";
import Tag from "../../Tag";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";
import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { useTagsState } from "@/hooks/useTags";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import { TagReference } from "@/types";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import _ from "lodash";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  let _tags =
    tags.filter(t => {
      const inTempLog = tempLog?.data?.tags?.map(d => d.id).includes(t.id)

      return (
        (!inTempLog && !t.isArchived) ||
        (inTempLog && t.isArchived) ||
        (inTempLog && !t.isArchived)
      )
    })

  const marginTop = getLogEditMarginTop()

  return (
    <View style={{
      flex: 1,
      width: '100%',
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 20,
      marginTop,
    }}>
      <SlideHeadline>{t('log_tags_question')}</SlideHeadline>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.logBackground, colors.logBackgroundTransparent]}
        style={{
          position: 'absolute',
          height: 24,
          top: 24,
          zIndex: 1,
          width: '100%',
        }}
      />
      <LinearGradient
        colors={[colors.logBackgroundTransparent, colors.logBackground]}
        style={{
          position: 'absolute',
          height: 32,
          bottom: insets.bottom + 54 + 32,
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
            marginTop: 24,
            paddingBottom: insets.bottom,
          }}
        >
          {_tags?.map(tag => {
            return (
              <Tag
                onPress={async () => {
                  const newTags = tempLog?.data?.tags?.map(d => d.id).includes(tag.id) ?
                    tempLog?.data?.tags.filter(t => t.id !== tag.id) :
                    [...tempLog?.data.tags || [], tag]
                  onChange(newTags)
                }}
                title={tag.title}
                colorName={tag.color}
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
      <Footer>
        {showDisable && (
          <LinkButton
            type="secondary"
            onPress={onDisableStep}
            style={{
              fontWeight: '400',
            }}
          >{t('log_tags_disable')}</LinkButton>
        )}
      </Footer>
    </View>
  )
}