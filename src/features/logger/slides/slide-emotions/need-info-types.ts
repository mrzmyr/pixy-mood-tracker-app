/** Props shared by the iOS popover, the Android tooltip, and the fallback. */
export interface NeedInfoProps {
  /** Need name, for example "Rest & Body". */
  title: string;
  /** One sentence on what the need means. */
  description: string;
  /** Emotion labels that often come with the need met. */
  met: string[];
  /** Emotion labels that often come with the need unmet. */
  unmet: string[];
  testID?: string;
}
