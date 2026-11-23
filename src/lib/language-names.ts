/**
 * Each app language in its own words, for the Language row in Settings.
 * Hermes has no `Intl.DisplayNames`. Keys match `supportedLocales` in
 * app.json; Norwegian appears as `nb` and `no`.
 */
const LANGUAGE_NAMES = {
  ar: "العربية",
  cs: "Čeština",
  da: "Dansk",
  de: "Deutsch",
  el: "Ελληνικά",
  en: "English",
  es: "Español",
  fi: "Suomi",
  fr: "Français",
  he: "עברית",
  hi: "हिन्दी",
  hr: "Hrvatski",
  hu: "Magyar",
  id: "Bahasa Indonesia",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  ms: "Bahasa Melayu",
  nb: "Norsk",
  nl: "Nederlands",
  no: "Norsk",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  ru: "Русский",
  sk: "Slovenčina",
  sv: "Svenska",
  th: "ไทย",
  tr: "Türkçe",
  uk: "Українська",
  vi: "Tiếng Việt",
  zh: "中文",
} as const satisfies Record<string, string>;

/** Name of language `code` in that language; the code itself if unknown. */
export const getLanguageName = (code: string): string =>
  new Map<string, string>(Object.entries(LANGUAGE_NAMES)).get(code) ?? code;
