import { LoggerCreate } from "@/components/Logger"
import { RootStackScreenProps } from "../../../types"

export const LogCreate = ({ route }: RootStackScreenProps<'LogCreate'>) => {
  return (
    <LoggerCreate
      dateTime={route.params.dateTime}
      initialStep='rating'
      avaliableSteps={route.params.avaliableSteps}
    />
  )
}