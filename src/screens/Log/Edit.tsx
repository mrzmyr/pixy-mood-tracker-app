import { LoggerEdit } from "@/components/Logger";
import type { RootStackScreenProps } from "../../../types";

export const LogEdit = ({ route }: RootStackScreenProps<"LogEdit">) => {
  return <LoggerEdit id={route.params.id} initialStep={route.params.step} />;
};
