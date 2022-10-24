const { Translate } = require("@google-cloud/translate").v2;
const fs = require("fs");
const credentials = require("../credentials/google-cloud-service-account.json");

const path = __dirname + "/../assets/locales/";
const filesArray = fs
  .readdirSync(path)
  .filter((file) => fs.lstatSync(path + file).isFile());
const locales = {};
filesArray.forEach((file) => {
  console.log("reading", file);
  try {
    locales[file.replace(".json", "")] = JSON.parse(
      fs.readFileSync(path + file, "utf8")
    );
  } catch (e) {
    console.log("error reading", file);
  }
});

const FORCE_KEYS = [];

const missingKeys = {};

const enKeys = Object.keys(locales.en);

enKeys.forEach((key) => {
  // ['zh'].forEach(localeKey => {
  Object.keys(locales).forEach((localeKey) => {
    if (!missingKeys[localeKey]) missingKeys[localeKey] = [];
    if (
      !Object.keys(locales[localeKey]).includes(key) ||
      FORCE_KEYS.includes(key)
    ) {
      missingKeys[localeKey].push(key);
    }
  });
});

const translate = async (text, target) => {
  const translate = new Translate({
    credentials,
    projectId: "pixy-mood-tracker",
  });

  const [translation] = await translate.translate(text, target);

  console.log(`Text: ${text}`);
  console.log(`Translation: ${translation}`);

  return translation;
};

(async () => {
  const result = {};

  for (const localeKey in missingKeys) {
    for (const index in missingKeys[localeKey]) {
      const key = missingKeys[localeKey][index];
      if (!result[localeKey]) result[localeKey] = {};
      console.log("translating…", locales.en[key], localeKey, key, localeKey);
      console.log("");
      if (Array.isArray(locales.en[key])) {
        const translations = await Promise.all(
          locales.en[key].map((text) => translate(text, localeKey))
        );
        console.log(translations);
        result[localeKey][key] = translations;
      } else {
        result[localeKey][key] = await translate(locales.en[key], localeKey);
      }
    }
  }

  for (const localeKey in result) {
    const locale = {
      ...locales[localeKey],
      ...result[localeKey],
    };
    fs.writeFileSync(
      path + localeKey + ".json",
      JSON.stringify(locale, null, 2)
    );
    console.log("saved", localeKey, locale);
  }
})();
