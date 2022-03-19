import AppleConnectApi from '@mrzmyr/apple-store-connect';
import fs from 'fs';
import { readDirYAML } from './utils';

const appleAPIKeyId = '24XTH26P94';
const appleAPIIssuerId = '5a67e781-d32c-4528-b2a4-17518fe813f5';
const appleAPIPrivateKey = fs.readFileSync(`${__dirname}/../credentials/apple-api-private-key.p8`);

const locales = readDirYAML(`${__dirname}/app-store-metadata/`);

const updateAppleStoreMetadata = async () => {
  // const apps = await appleConnectApi.getApps()
  const appId = '1605327124' // apps.data[0].id;
  const versions = await appleConnectApi.getAppStoreVersions(appId);
  const versionId = versions.data[0].id
  
  const localizations = await appleConnectApi.getAppStoreVersionLocalizations(versionId);

  // en is not officially supported by Apple, its for reference only
  const localeKeys = Object.keys(locales).filter(key => key !== 'en');
  
  for(let l = 0; l < localeKeys.length; l++) {
    const locale = localeKeys[l];
    const localizationsFound = localizations.data.filter((localization: any) => localization.attributes.locale === locale)
    
    console.log()
    console.log('Running for', locale, `(${l + 1}/${localeKeys.length})`)

    if(localizationsFound.length > 0) {
      console.log('Modifing locale', locale, '…')
      await appleConnectApi.modifyAppStoreVersionLocalizations({
        id: localizationsFound[0].id,
        attributes: {
          supportUrl: locales[locale].support_url,
          whatsNew: locales[locale].whats_new,
          description: locales[locale].description,
          keywords: locales[locale].keywords,
        }
      })
    } else {
      console.log('Creating locale', locale, '…')
      await appleConnectApi.createAppStoreVersionLocalizations({
        versionId,
        attributes: {
          locale: locale,
          supportUrl: locales[locale].support_url,
          whatsNew: locales[locale].whats_new,
          description: locales[locale].description,
          keywords: locales[locale].keywords,
        }
      })
    }
  }

  console.log();
}

const appleConnectApi = new AppleConnectApi({
  keyId: appleAPIKeyId,
  issuerId: appleAPIIssuerId,
  privateKey: appleAPIPrivateKey,
});

;(async () => {
  try {
    
    await updateAppleStoreMetadata()
    
  } catch (error: any) {
    console.error(error.message);
  }
})()
