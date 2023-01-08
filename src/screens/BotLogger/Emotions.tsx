import Button from "@/components/Button"
import { SlideEmotions } from "@/components/Logger/slides/SlideEmotions"
import useColors from "@/hooks/useColors"
import { Emotion } from "@/types"
import { useState } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { RootStackScreenProps } from "../../../types"
import { PageModalLayout } from "@/components/PageModalLayout"

export const BotLoggerEmotions = ({
  route: { params },
}: RootStackScreenProps<'BotLoggerEmotions'>) => {
  const insets = useSafeAreaInsets()
  const colors = useColors()

  const [emotions, setEmotions] = useState<Emotion[]>([])

  return (
    <PageModalLayout
      style={{
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: insets.bottom,
        backgroundColor: colors.logBackground,
      }}
    >
      <SlideEmotions
        onChange={(emotions: Emotion[]) => {
          setEmotions(emotions)
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
            params.onDone(emotions)
          }}
        >Done</Button>
      </View>
    </PageModalLayout>
  )
}