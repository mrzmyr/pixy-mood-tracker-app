const fs = require('fs');
const {
  Translate
} = require('@google-cloud/translate').v2;
const credentials = require('../credentials/google-cloud-service-account.json');
const yaml = require('js-yaml');

type FileDirectory = {
  [key: string]: {
    [key: string]: string
  }
}

export const readDirJSON = (path: string): FileDirectory => {
  const filesArray = fs
    .readdirSync(path)
    .filter((filename: string) => 
      fs.lstatSync(path + filename).isFile() &&
      filename.endsWith('.json')
    )

  const files: FileDirectory = {};
  
  filesArray.forEach((filename: string) => {
    console.log('Reading', filename, '…')
    try {
      files[filename.replace('.json', '')] = JSON.parse(fs.readFileSync(path + filename, 'utf8'))
    } catch (e) {
      console.log('error reading', filename)
    }
  });

  return files;
}

export const readDirYAML = (path: string): FileDirectory => {
  const filesArray = fs
    .readdirSync(path)
    .filter((filename: string) => 
      fs.lstatSync(path + filename).isFile() &&
      filename.endsWith('.yml')
    )

  const files: FileDirectory = {};
  
  filesArray.forEach((filename: string) => {
    console.log('Reading', filename, '…')
    try {
      files[filename.replace('.yml', '')] = yaml.load(fs.readFileSync(path + filename, 'utf8')) || {}
    } catch (e) {
      console.log('error reading', filename)
    }
  });

  return files;
}

const LANUGAE_CODE_APPLE2GOOGLE: {
  [key: string]: string
} = {
  'ar-SA': 'ar',
  'de-DE': 'de',
  'en-US': 'en',
  'es-ES': 'es',
  'es-MX': 'es',
  'fr-FR': 'fr',
  'fr-CA': 'fr',
  'nl-NL': 'nl',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
}

export const translate = async ({
  text,
  target
}: {
  text: string,
  target: string,
}): Promise<string> => {
  const translate = new Translate({
    credentials,
    projectId: 'pixy-mood-tracker'
  });
  
  const [translation] = await translate.translate(text, LANUGAE_CODE_APPLE2GOOGLE[target] || target);

  console.log(`Text: ${text}`);
  console.log(`Translation: ${translation}`);

  return translation;
}

export const JSON2YML = (json: any): string => {
  return yaml.dump(json, {
    lineWidth: -1,
  });
}