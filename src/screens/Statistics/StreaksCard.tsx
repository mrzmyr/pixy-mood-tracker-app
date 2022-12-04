import { View } from "react-native"
import { ActionCard } from "@/components/ActionCard"
import { Crown } from "@/components/icons/Crown"
import { Fire } from "@/components/icons/Fire"
import useColors from "../../hooks/useColors"
import { useStatistics } from "../../hooks/useStatistics"

export const StreaksCard = () => {
  const statistics = useStatistics()
  const colors = useColors()

  return (
    <View
      style={{
        flexDirection: 'row',
      }}
    >
      <ActionCard
        icon={<Fire color={colors.text} />}
        title={`${statistics.state.streaks.current} days`}
        subtitle={`Current Streak`}
        style={{
          flex: 1,
          marginRight: 8,
        }}
      />
      <ActionCard
        icon={<Crown color={colors.text} />}
        title={`${statistics.state.streaks.longest} days`}
        subtitle={`Longest Streak`}
        style={{
          flex: 1,
        }}
      />
    </View>
  )
}