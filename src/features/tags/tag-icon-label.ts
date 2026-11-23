import { DEFAULT_TAG_ICON, isTagIconKey, TAG_ICONS } from "./tag-icons";

/**
 * Spoken name of a tag icon: its first keyword, like "coffee". English only,
 * like the keywords. Unknown or missing key: the default icon's name.
 */
export const iconLabel = (icon: string | undefined) => {
  const key = icon && isTagIconKey(icon) ? icon : DEFAULT_TAG_ICON;
  return TAG_ICONS[key].keywords[0] ?? key;
};
