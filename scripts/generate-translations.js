const {Translate} = require('@google-cloud/translate').v2;
const fs = require('fs');
const credentials = require('./credentials.json');

const path = __dirname + '/../assets/locales/';
const filesArray = fs.readdirSync(path).filter(file => fs.lstatSync(path+file).isFile())
const locales = {};
filesArray.forEach(file => locales[file.replace('.json', '')] = JSON.parse(fs.readFileSync(path+file, 'utf8')));

const missingKeys = {};

const enKeys = Object.keys(locales.en);

enKeys.forEach(key => {
  Object.keys(locales).forEach(localeKey => {
    if(!missingKeys[localeKey]) missingKeys[localeKey] = [];
    if(!Object.keys(locales[localeKey]).includes(key)) {
      missingKeys[localeKey].push(key);
    }
  })
})

const translate = async (text, target) => {
  const translate = new Translate({
    credentials,
    projectId: 'pixy-mood-tracker'
  });
  
  const [translation] = await translate.translate(text, target);

  console.log(`Text: ${text}`);
  console.log(`Translation: ${translation}`);

  return translation;
}

(async () => {
  const result = {};

  for(const localeKey in missingKeys) {
    for(const index in missingKeys[localeKey]) {
      const key = missingKeys[localeKey][index]
      if(!result[localeKey]) result[localeKey] = {}
      console.log('translating…', locales.en[key], localeKey, key, localeKey)
      result[localeKey][key] = await translate(locales.en[key], localeKey)
    }
  }

  for(const localeKey in result) {
    const locale = {
      ...locales[localeKey],
      ...result[localeKey],
    };
    fs.writeFileSync(path+localeKey+'.json', JSON.stringify(locale, null, 2))
    console.log('saved', localeKey, locale)
  }
})()