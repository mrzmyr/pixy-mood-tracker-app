/** Lowercase text without accents, so "Café" and "cafe" compare equal. */
const normalizeSearchText = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/gu, "")
    .toLocaleLowerCase();

/**
 * Substring match that ignores case and accents. An empty or blank query
 * matches everything.
 */
export const matchesSearch = (text: string, query: string) =>
  normalizeSearchText(text).includes(normalizeSearchText(query.trim()));
