import * as Localization from 'expo-localization';
import i18n from 'i18n-js';

i18n.translations = {
  ar: require('../assets/locales/ar.json'),
  ca: require('../assets/locales/ca.json'),
  zh: require('../assets/locales/zh.json'),
  hr: require('../assets/locales/hr.json'),
  cs: require('../assets/locales/cs.json'),
  da: require('../assets/locales/da.json'),
  nl: require('../assets/locales/nl.json'),
  en: require('../assets/locales/en.json'),
  fi: require('../assets/locales/fi.json'),
  fr: require('../assets/locales/fr.json'),
  de: require('../assets/locales/de.json'),
  el: require('../assets/locales/el.json'),
  he: require('../assets/locales/he.json'),
  hi: require('../assets/locales/hi.json'),
  hu: require('../assets/locales/hu.json'),
  id: require('../assets/locales/id.json'),
  it: require('../assets/locales/it.json'),
  ja: require('../assets/locales/ja.json'),
  ko: require('../assets/locales/ko.json'),
  ms: require('../assets/locales/ms.json'),
  nn: require('../assets/locales/no.json'),
  pl: require('../assets/locales/pl.json'),
  pt: require('../assets/locales/pt.json'),
  ro: require('../assets/locales/ro.json'),
  ru: require('../assets/locales/ru.json'),
  sk: require('../assets/locales/sk.json'),
  es: require('../assets/locales/es.json'),
  sv: require('../assets/locales/sv.json'),
  th: require('../assets/locales/th.json'),
  tr: require('../assets/locales/tr.json'),
  uk: require('../assets/locales/uk.json'),
  vi: require('../assets/locales/vi.json'),
};

i18n.locale = Localization.locale;
i18n.fallbacks = true;

export function useTranslation() {
  return {
    ...i18n,
    language: i18n.locale.split('-')[0],
  };
}
