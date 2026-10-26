import useColors from "@/hooks/use-colors";

/**
 * Background of native grouped list screens (`SettingsForm`, `FieldGroup`)
 * and their header. iOS and web: the app background. Android:
 * [use-form-background.android.ts](./use-form-background.android.ts).
 */
export default function useFormBackground(): string {
  return useColors().background;
}
