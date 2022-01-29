import dayjs from 'dayjs';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import localizedFormat from 'dayjs/plugin/localizedFormat'
import weekOfYear from 'dayjs/plugin/weekOfYear'

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
  nn: require('../assets/locales/nn.json'),
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

const dayjs_locales = {
  ar: require('dayjs/locale/ar'),
  ca: require('dayjs/locale/ca'),
  zh: require('dayjs/locale/zh'),
  hr: require('dayjs/locale/hr'),
  cs: require('dayjs/locale/cs'),
  da: require('dayjs/locale/da'),
  nl: require('dayjs/locale/nl'),
  en: require('dayjs/locale/en'),
  fi: require('dayjs/locale/fi'),
  fr: require('dayjs/locale/fr'),
  de: require('dayjs/locale/de'),
  el: require('dayjs/locale/el'),
  he: require('dayjs/locale/he'),
  hi: require('dayjs/locale/hi'),
  hu: require('dayjs/locale/hu'),
  id: require('dayjs/locale/id'),
  it: require('dayjs/locale/it'),
  ja: require('dayjs/locale/ja'),
  ko: require('dayjs/locale/ko'),
  ms: require('dayjs/locale/ms'),
  nn: require('dayjs/locale/nn'),
  pl: require('dayjs/locale/pl'),
  pt: require('dayjs/locale/pt'),
  ro: require('dayjs/locale/ro'),
  ru: require('dayjs/locale/ru'),
  sk: require('dayjs/locale/sk'),
  es: require('dayjs/locale/es'),
  sv: require('dayjs/locale/sv'),
  th: require('dayjs/locale/th'),
  tr: require('dayjs/locale/tr'),
  uk: require('dayjs/locale/uk'),
  vi: require('dayjs/locale/vi'),
}

let locale = Localization.locale;
if(locale.includes('-')) locale = locale.split('-')[0];

if(locale in dayjs_locales) {
  dayjs.locale(locale)
} else {
  dayjs.locale('en')
}

dayjs.extend(weekOfYear)
dayjs.extend(localizedFormat)

export function useTranslation() {
  return i18n;
}
