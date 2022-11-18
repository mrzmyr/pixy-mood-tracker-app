import { Logger } from "../../components/Logger"
import { RootStackScreenProps } from "../../types"

export const LogEdit = ({ route }: RootStackScreenProps<'LogEdit'>) => {
  return <Logger id={route.params.id} initialStep={route.params.step} />
}
