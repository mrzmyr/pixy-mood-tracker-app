import fs from 'fs';
import { translate } from './utils';
const { readDirYAML, JSON2YML } = require('./utils');

const dir = __dirname + '/app-store-metadata/';
const locales = readDirYAML(dir);

const KEY_BLACK_LIST = [
  'support_url',
]

const FORCE_TRANSLATE = [
  'whats_new',
]

type MissingKeyMap = {
  [key: string]: string[]
}

const missingKeyMap: MissingKeyMap = {};

for(const localeKey of Object.keys(locales).filter(key => key !== 'en')) {
  for(const templateKey of Object.keys(locales.en)) {
    if(!missingKeyMap[localeKey]) missingKeyMap[localeKey] = [];
    if(
      FORCE_TRANSLATE.includes(templateKey) ||
      !Object.keys(locales[localeKey]).includes(templateKey)
    ) {
      missingKeyMap[localeKey].push(templateKey);
    }
  }
}

(async () => {
  const result: {
    [locale: string]: {
      [key: string]: string
    }
  } = {};

  for(const localeKey in missingKeyMap) {
    for(const key of missingKeyMap[localeKey]) {
      if(!result[localeKey]) result[localeKey] = {}
      if(KEY_BLACK_LIST.includes(key)) {
        result[localeKey][key] = locales.en[key];
      } else {
        console.log('translating: ', localeKey, key, '…')
        result[localeKey][key] = await translate({
          text: locales.en[key], 
          target: localeKey 
        })
      }
    }

    const locale = {
      ...locales[localeKey],
      ...result[localeKey],
    };
    fs.writeFileSync(`${dir}${localeKey}.yml`, JSON2YML(locale));
    console.log('Saved', localeKey, '!')
  }
})()