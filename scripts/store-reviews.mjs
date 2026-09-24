#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { createPrivateKey, createSign } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const DEFAULT_APPLE_ID = '1605327124';
const DEFAULT_PLAY_PACKAGE = 'com.devmood.pixymoodtracker';
const APPLE_API = 'https://api.appstoreconnect.apple.com/v1';
const PLAY_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

function fail(status, message, why, fix) {
  const error = new Error(message);
  error.details = { status, message, why, fix };
  throw error;
}

function parseArgs(argv) {
  const options = {
    store: 'all',
    limit: 50,
    minRating: 1,
    maxRating: 3,
    json: false,
    help: false,
  };
  const values = new Map([
    ['--store', 'store'], ['--limit', 'limit'], ['--min-rating', 'minRating'],
    ['--max-rating', 'maxRating'], ['--apple-id', 'appleId'], ['--apple-bundle-id', 'appleBundleId'], ['--play-package', 'playPackage'],
  ]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--json') options.json = true;
    else if (values.has(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) fail(2, `Missing value for ${arg}`, 'A required option value was not supplied.', `Pass a value after ${arg}.`);
      options[values.get(arg)] = argv[++i];
    } else fail(2, `Unknown option: ${arg}`, 'The CLI received an unsupported argument.', 'Run store-reviews --help to see supported options.');
  }

  options.limit = Number(options.limit);
  options.minRating = Number(options.minRating);
  options.maxRating = Number(options.maxRating);
  options.appleBundleId ??= 'com.devmood.pixymoodtracker';
  options.playPackage ??= DEFAULT_PLAY_PACKAGE;
  if (!options.help && !['all', 'app-store', 'play'].includes(options.store)) fail(2, 'Invalid store', 'Store must be all, app-store, or play.', 'Pass --store all, --store app-store, or --store play.');
  if (!options.help && (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 1000)) fail(2, 'Invalid limit', 'Limit must be an integer from 1 to 1000.', 'Pass --limit with a value from 1 to 1000.');
  if (!options.help && (![options.minRating, options.maxRating].every(Number.isInteger) || options.minRating < 1 || options.maxRating > 5 || options.minRating > options.maxRating)) fail(2, 'Invalid rating range', 'Ratings must be integers from 1 to 5, with minimum no greater than maximum.', 'Adjust --min-rating and --max-rating.');
  return options;
}

function help() {
  return `List recent low-rated Pixy reviews from App Store Connect and Google Play Console.\n\nUsage:\n  bun run reviews -- [options]\n\nOptions:\n  --store all|app-store|play  Store source (default: all)\n  --limit N                   Matching reviews per store (default: 50, max: 1000)\n  --min-rating N              Lowest included rating (default: 1)\n  --max-rating N              Highest included rating (default: 3)\n  --apple-id ID               App Store Connect app resource ID override\n  --apple-bundle-id ID        App bundle ID (default: com.devmood.pixymoodtracker)\n  --play-package NAME         Google Play package (default: ${DEFAULT_PLAY_PACKAGE})\n  --json                      Emit stable JSON instead of a table\n\nCredentials (read-only access):\n  App Store Connect: APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH\n  Google Play:       GOOGLE_PLAY_SERVICE_ACCOUNT_JSON\n\nThe Google service account needs Google Play Console access to this app and the Android Publisher API enabled.\nThe App Store Connect API key needs access to this app. Secrets stay in local files/environment and are never printed.\n`;
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

async function readCredential(pathEnv, missingMessage, fix) {
  const filePath = process.env[pathEnv];
  if (!filePath) fail(2, missingMessage, `${pathEnv} is not set.`, fix);
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    fail(2, 'Credential file is not readable', `${pathEnv} points to a file that cannot be read.`, `Set ${pathEnv} to a readable local credential file.`);
  }
}

function makeAppleToken() {
  const issuer = process.env.APPLE_ISSUER_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const keyPath = process.env.APPLE_PRIVATE_KEY_PATH;
  if (!issuer || !keyId || !keyPath) fail(2, 'App Store Connect credentials are missing', 'APPLE_ISSUER_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY_PATH are required.', 'Create an App Store Connect API key with app access and set the three environment variables.');
  return readFile(keyPath, 'utf8').then((privateKey) => {
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: issuer, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' }))}`;
    const signer = createSign('SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign({ key: createPrivateKey(privateKey), dsaEncoding: 'ieee-p1363' }).toString('base64url');
    return `${unsigned}.${signature}`;
  }).catch((error) => {
    if (error.details) throw error;
    fail(2, 'App Store Connect key could not be used', 'The private key file is unreadable or is not a valid EC private key.', 'Check APPLE_PRIVATE_KEY_PATH and use the .p8 key that matches APPLE_KEY_ID.');
  });
}

async function requestJson(url, headers = {}) {
  let response;
  try {
    response = await fetch(url, { headers });
  } catch {
    fail(3, 'Review API request failed', 'The store API could not be reached.', 'Check network access, then retry.');
  }
  if (!response.ok) {
    const safeReason = response.status === 401 || response.status === 403
      ? 'The API rejected the configured credentials or app access.'
      : `The store API returned HTTP ${response.status}.`;
    fail(3, 'Could not retrieve reviews', safeReason, response.status === 401 || response.status === 403
      ? 'Verify API enablement, app access, and read permissions for the credential.'
      : 'Retry later and check the store API status.');
  }
  try {
    return await response.json();
  } catch {
    fail(3, 'Store API returned invalid JSON', 'The response body could not be parsed.', 'Retry later; if this persists, check the store API response format.');
  }
}

async function fetchAppleReviews(options) {
  const token = await makeAppleToken();
  const reviews = [];
  let appId = options.appleId;
  if (!appId) {
    const lookup = new URL(`${APPLE_API}/apps`);
    lookup.searchParams.set('filter[bundleId]', options.appleBundleId);
    const apps = await requestJson(lookup, { Authorization: `Bearer ${token}` });
    appId = apps.data?.[0]?.id;
    if (!appId) fail(3, 'App not found in App Store Connect', `No app matched bundle ID ${options.appleBundleId}.`, 'Check the bundle ID or pass its App Store Connect app resource ID with --apple-id.');
  }
  let url = new URL(`${APPLE_API}/apps/${encodeURIComponent(appId)}/customerReviews`);
  url.searchParams.set('limit', '200');
  url.searchParams.set('sort', '-createdDate');
  url.searchParams.set('filter[rating]', Array.from({ length: options.maxRating - options.minRating + 1 }, (_, i) => String(options.minRating + i)).join(','));

  while (url && reviews.length < options.limit) {
    const page = await requestJson(url, { Authorization: `Bearer ${token}` });
    for (const item of page.data ?? []) {
      const a = item.attributes ?? {};
      reviews.push({
        store: 'app-store', id: item.id, rating: a.rating, date: a.createdDate,
        title: a.title ?? '', text: a.body ?? '', author: a.reviewerNickname ?? '',
        territory: a.territory ?? '', version: '',
      });
    }
    url = page.links?.next ? new URL(page.links.next) : null;
  }
  return reviews;
}

async function googleAccessToken() {
  let account;
  try {
    account = JSON.parse(await readCredential('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', 'Google Play credentials are missing', 'Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to a service-account JSON file with Play Console app access.'));
  } catch (error) {
    if (error.details) throw error;
    fail(2, 'Google service-account file is invalid', 'The credential file is not valid JSON or lacks the expected service-account fields.', 'Use a Google Cloud service-account JSON key and point GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to it.');
  }
  if (!account.client_email || !account.private_key) fail(2, 'Google service-account file is incomplete', 'client_email or private_key is missing.', 'Use an unmodified service-account JSON key file.');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: account.token_uri ?? 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const tokenUrl = account.token_uri ?? 'https://oauth2.googleapis.com/token';
  let response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
  } catch {
    fail(3, 'Google OAuth request failed', 'Google OAuth could not be reached.', 'Check network access, then retry.');
  }
  if (!response.ok) fail(3, 'Google OAuth rejected the service account', `Google OAuth returned HTTP ${response.status}.`, 'Check that the service-account key is active and the Android Publisher API is enabled.');
  const data = await response.json();
  if (!data.access_token) fail(3, 'Google OAuth response has no access token', 'The OAuth response did not include access_token.', 'Check service-account configuration and retry.');
  return data.access_token;
}

function googleDate(timestamp) {
  if (!timestamp?.seconds) return '';
  return new Date(Number(timestamp.seconds) * 1000 + Math.floor(Number(timestamp.nanos ?? 0) / 1e6)).toISOString();
}

async function fetchPlayReviews(options) {
  const token = await googleAccessToken();
  const reviews = [];
  let pageToken;
  do {
    const url = new URL(`${PLAY_API}/applications/${encodeURIComponent(options.playPackage)}/reviews`);
    url.searchParams.set('maxResults', '100');
    if (pageToken) url.searchParams.set('token', pageToken);
    const page = await requestJson(url, { Authorization: `Bearer ${token}` });
    for (const item of page.reviews ?? []) {
      const user = item.comments?.find((comment) => comment.userComment)?.userComment;
      if (!user || user.starRating < options.minRating || user.starRating > options.maxRating) continue;
      reviews.push({
        store: 'play', id: item.reviewId, rating: user.starRating,
        date: googleDate(user.lastModified ?? user.reviewSubmitDate),
        title: '', text: user.text ?? '', author: item.authorName ?? '',
        territory: user.reviewerLanguage ?? '', version: user.appVersionName ?? '',
      });
    }
    pageToken = page.tokenPagination?.nextPageToken;
  } while (pageToken && reviews.length < options.limit);
  return reviews;
}

function sortReviews(reviews) {
  return reviews.sort((a, b) => b.date.localeCompare(a.date) || a.store.localeCompare(b.store) || a.id.localeCompare(b.id));
}

function printTable(reviews) {
  if (reviews.length === 0) {
    process.stdout.write('No matching reviews found.\n');
    return;
  }
  for (const review of reviews) {
    process.stdout.write(`[${review.store}] ${review.date} · ${review.rating}/5 · ${review.author}${review.territory ? ` · ${review.territory}` : ''}\n`);
    if (review.title) process.stdout.write(`${review.title}\n`);
    process.stdout.write(`${review.text.replace(/\s+/g, ' ').trim()}\n\n`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(help());
      return 0;
    }
    const stores = options.store === 'all' ? ['app-store', 'play'] : [options.store];
    const settled = await Promise.all(stores.map(async (store) => {
      try {
        return { store, reviews: store === 'app-store' ? await fetchAppleReviews(options) : await fetchPlayReviews(options) };
      } catch (error) {
        return { store, reviews: [], error: error.details ?? { status: 1, message: 'Review listing failed', why: 'An unexpected error occurred.', fix: 'Retry and inspect the CLI configuration.' } };
      }
    }));
    const results = settled.filter((result) => !result.error);
    const errors = settled.filter((result) => result.error).map(({ store, error }) => ({ store, ...error }));
    const all = sortReviews(results.flatMap((result) => result.reviews)).slice(0, options.limit * stores.length);
    if (options.json) process.stdout.write(`${JSON.stringify({ reviews: all, errors }, null, 2)}\n`);
    else {
      printTable(all);
      for (const error of errors) process.stderr.write(`${JSON.stringify(error)}\n`);
    }
    return errors.length > 0 ? 1 : 0;
  } catch (error) {
    const details = error.details ?? { status: 1, message: 'Review listing failed', why: 'An unexpected error occurred.', fix: 'Retry and inspect the CLI configuration.' };
    process.stderr.write(`${JSON.stringify(details)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
