import Button from "@/components/Button"
import { SlideTags } from "@/components/Logger/slides/SlideTags"
import useColors from "@/hooks/useColors"
import { useTemporaryLog } from "@/hooks/useTemporaryLog"
import { TagReference } from "@/types"
import { useState } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RootStackScreenProps } from "../../../types"
import { PageModalLayout } from "@/components/PageModalLayout"

export const BotLoggerTags = ({
  route: { params },
}: RootStackScreenProps<'BotLoggerTags'>) => {
  const tempLog = useTemporaryLog()
  const insets = useSafeAreaInsets()
  const colors = useColors()

  const [tags, setTags] = useState<TagReference[]>([])

  return (
    <PageModalLayout
      style={{
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: insets.bottom,
        backgroundColor: colors.logBackground,
      }}
    >
      <SlideTags
        onChange={(tags: TagReference[]) => {
          tempLog.update({ tags })
          setTags(tags)
        }}
        showFooter={false}
        showDisable={false}
      />
      <View
        style={{
          marginTop: 16,
          paddingHorizontal: 16,
        }}
      >
        <Button
          onPress={() => {
            params.onDone(tags)
          }}
        >Done</Button>
      </View>
    </PageModalLayout>
  )
}