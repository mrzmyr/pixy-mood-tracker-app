import { useMaterialColors } from "@expo/ui/jetpack-compose";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";

/**
 * Material 3 `surface` of the seeded palette: the color Compose paints
 * behind a `FieldGroup`. The header uses it too, so bar and list match.
 */
export default function useFormBackground(): string {
  return useMaterialColors({ seedColor: MATERIAL_SEED_COLOR }).surface;
}
