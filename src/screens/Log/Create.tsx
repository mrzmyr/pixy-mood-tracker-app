import { Logger } from "@/components/Logger"
import { RootStackScreenProps } from "../../../types"

export const LogCreate = ({ route }: RootStackScreenProps<'LogCreate'>) => {
  return <Logger dateTime={route.params.dateTime} initialStep='rating' />
}