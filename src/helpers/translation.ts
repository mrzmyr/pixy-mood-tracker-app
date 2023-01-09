import * as Localization from 'expo-localization';
import i18n from 'i18n-js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat'
import weekOfYear from 'dayjs/plugin/weekOfYear'

import en from '../../assets/locales/en.json';

i18n.translations = {
  ar: require('../../assets/locales/ar.json'),
  zh: require('../../assets/locales/zh.json'),
  hr: require('../../assets/locales/hr.json'),
  cs: require('../../assets/locales/cs.json'),
  da: require('../../assets/locales/da.json'),
  nl: require('../../assets/locales/nl.json'),
  en: require('../../assets/locales/en.json'),
  fi: require('../../assets/locales/fi.json'),
  fr: require('../../assets/locales/fr.json'),
  de: require('../../assets/locales/de.json'),
  el: require('../../assets/locales/el.json'),
  he: require('../../assets/locales/he.json'),
  hi: require('../../assets/locales/hi.json'),
  hu: require('../../assets/locales/hu.json'),
  id: require('../../assets/locales/id.json'),
  it: require('../../assets/locales/it.json'),
  ja: require('../../assets/locales/ja.json'),
  ko: require('../../assets/locales/ko.json'),
  ms: require('../../assets/locales/ms.json'),
  nn: require('../../assets/locales/no.json'),
  pl: require('../../assets/locales/pl.json'),
  pt: require('../../assets/locales/pt.json'),
  ro: require('../../assets/locales/ro.json'),
  ru: require('../../assets/locales/ru.json'),
  sk: require('../../assets/locales/sk.json'),
  es: require('../../assets/locales/es.json'),
  sv: require('../../assets/locales/sv.json'),
  th: require('../../assets/locales/th.json'),
  tr: require('../../assets/locales/tr.json'),
  uk: require('../../assets/locales/uk.json'),
  vi: require('../../assets/locales/vi.json'),
};

// https://unicode.org/Public/cldr/37/core.zip
const firstDayOfWeek = {
  // sunday
  0: [
    'AG', 'AS', 'AU', 'BD', 'BR', 'BS', 'BT', 'BW', 'BZ', 'CA', 'CN', 'CO', 'DM', 'DO', 'ET',
    'GT', 'GU', 'HK', 'HN', 'ID', 'IL', 'IN', 'JM', 'JP', 'KE', 'KH', 'KR', 'LA', 'MH', 'MM',
    'MO', 'MT', 'MX', 'MZ', 'NI', 'NP', 'PA', 'PE', 'PH', 'PK', 'PR', 'PT', 'PY', 'SA', 'SG',
    'SV', 'TH', 'TT', 'TW', 'UM', 'US', 'VE', 'VI', 'WS', 'YE', 'ZA', 'ZW'
  ],
  // monday
  1: [
    '001', 'AD', 'AI', 'AL', 'AM', 'AN', 'AR', 'AT', 'AX', 'AZ', 'BA', 'BE', 'BG', 'BM', 'BN',
    'BY', 'CH', 'CL', 'CM', 'CR', 'CY', 'CZ', 'DE', 'DK', 'EC', 'EE', 'ES', 'FI', 'FJ', 'FO',
    'FR', 'GB', 'GE', 'GF', 'GP', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'KG', 'KZ', 'LB', 'LI',
    'LK', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MN', 'MQ', 'MY', 'NL', 'NO', 'NZ', 'PL',
    'RE', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'TJ', 'TM', 'TR', 'UA', 'UY', 'UZ', 'VA',
    'VN', 'XK'
  ],
  // saturday
  6: [
    'AE', 'AF', 'BH', 'DJ', 'DZ', 'EG', 'IQ', 'IR', 'JO', 'KW', 'LY', 'OM', 'QA', 'SD', 'SY',
  ],
  // friday
  5: [
    'MV'
  ]
}

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

i18n.locale = Localization.locale;
i18n.fallbacks = true;

export const locale = i18n.locale;
export const language = i18n.locale.split('-')[0];

const _getFirstDayOfWeek = (region: string): number => {
  for (const dayStr in firstDayOfWeek) {
    let dayNumber = parseInt(dayStr)
    if (firstDayOfWeek[dayNumber].includes(region)) {
      return dayNumber;
    }
  }

  return 1;
}

export const initializeDayjs = () => {
  let locale = Localization.locale;
  if (locale.includes('-')) locale = locale.split('-')[0];

  if (locale in dayjs_locales) {
    dayjs.locale(locale)
    if (dayjs.Ls[locale] && Localization.region !== null) {
      dayjs.Ls[locale].weekStart = _getFirstDayOfWeek(Localization.region);
    }
  } else {
    dayjs.locale('en')
  }

  dayjs.extend(weekOfYear)
  dayjs.extend(localizedFormat)
}

export const t = (key: keyof typeof en | string, options?: any) => {
  return i18n.t(key, options);
};
