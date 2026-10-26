/**
 * Initials for an avatar without a photo: first character of the first and
 * last word, upper case. One word gives one character. Blank names give an
 * empty string, so callers can fall back to an icon.
 */
export const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const [firstWord] = words;
  if (!firstWord) {
    return "";
  }
  const [first] = [...firstWord];
  const lastWord = words.length > 1 ? words.at(-1) : undefined;
  const [last = ""] = lastWord ? [...lastWord] : [];
  return `${first}${last}`.toLocaleUpperCase();
};
