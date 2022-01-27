import dayjs from 'dayjs';
import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import localizedFormat from 'dayjs/plugin/localizedFormat'

i18n.translations = {
  en: require('../assets/locales/en.json'),
  de: require('../assets/locales/de.json'),
  ja: require('../assets/locales/ja.json'),
  ru: require('../assets/locales/ru.json'),
  es: require('../assets/locales/es.json'),
  hi: require('../assets/locales/hi.json'),
  zh: require('../assets/locales/zh.json'),
};

i18n.locale = Localization.locale;
i18n.fallbacks = true;

const dayjs_locales = {
  en: require('dayjs/locale/en'),
  de: require('dayjs/locale/de'),
  ja: require('dayjs/locale/ja'),
  ru: require('dayjs/locale/ru'),
  es: require('dayjs/locale/es'),
  hi: require('dayjs/locale/hi'),
  zh: require('dayjs/locale/zh'),
}

let locale = Localization.locale;
if(locale.includes('-')) locale = locale.split('-')[0];

if(locale in dayjs_locales) {
  dayjs.locale(locale)
} else {
  dayjs.locale('en')
}

dayjs.extend(localizedFormat)

export function useTranslation() {
  return i18n;
}
