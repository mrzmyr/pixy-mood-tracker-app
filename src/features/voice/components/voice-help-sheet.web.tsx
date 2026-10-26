/**
 * Web build of the voice help sheet. `@expo/ui` has no web module, and
 * importing it throws at load, which blanks the whole web app. Voice mode
 * needs on-device speech, so web never opens it.
 */
export const VoiceHelpSheet = (_props: {
  isOpen: boolean;
  onClose: () => void;
  triggers: unknown[];
}) => null;
