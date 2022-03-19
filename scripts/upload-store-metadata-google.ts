import fs from 'fs';
import { readDirYAML } from './utils';

const {google} = require('googleapis');
const androidpublisher = google.androidpublisher('v3');

const locales = readDirYAML(`${__dirname}/app-store-metadata/`);

const updateGooglePlayMetadata = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFilename: `${__dirname}/../credentials/google-cloud-service-account-cli.json`,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const authClient = await auth.getClient();
  google.options({auth: authClient});

  const edit = await androidpublisher.edits.insert({
    packageName: 'com.devmood.pixymoodtracker',
  });
  // console.log(res.data);
}

;(async () => {
  try {
    
    await updateGooglePlayMetadata()
    
  } catch (error: any) {
    console.error(error.message);
  }
})()
