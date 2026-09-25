#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createPrivateKey, createSign } from "node:crypto";
import { pathToFileURL } from "node:url";

const DEFAULT_APPLE_ID = "1605327124";
const DEFAULT_PLAY_PACKAGE = "com.devmood.pixymoodtracker";
const APPLE_API = "https://api.appstoreconnect.apple.com/v1";
const PLAY_API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const PLAY_REVIEW_LIMITATION =
  "Google Play API returns only reviews created or modified in the last 7 days.";

function fail({ status, message, why, fix }) {
  const error = new Error(message);
  error.details = { status, message, why, fix };
  throw error;
}

function parseArgs(argv) {
  const options = {
    store: "all",
    limit: 50,
    minRating: 1,
    maxRating: 3,
    json: false,
    help: false,
  };
  const values = new Map([
    ["--store", "store"],
    ["--limit", "limit"],
    ["--min-rating", "minRating"],
    ["--max-rating", "maxRating"],
    ["--apple-id", "appleId"],
    ["--apple-bundle-id", "appleBundleId"],
    ["--play-package", "playPackage"],
  ]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (values.has(arg)) {
      if (!argv[i + 1] || argv[i + 1].startsWith("--")) {
        fail({
          status: 2,
          message: `Missing value for ${arg}`,
          why: "A required option value was not supplied.",
          fix: `Pass a value after ${arg}.`,
        });
      }
      options[values.get(arg)] = argv[++i];
    } else {
      fail({
        status: 2,
        message: `Unknown option: ${arg}`,
        why: "The CLI received an unsupported argument.",
        fix: "Run store-reviews --help to see supported options.",
      });
    }
  }

  options.limit = Number(options.limit);
  options.minRating = Number(options.minRating);
  options.maxRating = Number(options.maxRating);
  options.appleBundleId ??= "com.devmood.pixymoodtracker";
  options.playPackage ??= DEFAULT_PLAY_PACKAGE;
  if (!options.help && !["all", "app-store", "play"].includes(options.store)) {
    fail({
      status: 2,
      message: "Invalid store",
      why: "Store must be all, app-store, or play.",
      fix: "Pass --store all, --store app-store, or --store play.",
    });
  }
  if (
    !options.help &&
    (!Number.isInteger(options.limit) ||
      options.limit < 1 ||
      options.limit > 1000)
  ) {
    fail({
      status: 2,
      message: "Invalid limit",
      why: "Limit must be an integer from 1 to 1000.",
      fix: "Pass --limit with a value from 1 to 1000.",
    });
  }
  if (
    !options.help &&
    (![options.minRating, options.maxRating].every(Number.isInteger) ||
      options.minRating < 1 ||
      options.maxRating > 5 ||
      options.minRating > options.maxRating)
  ) {
    fail({
      status: 2,
      message: "Invalid rating range",
      why: "Ratings must be integers from 1 to 5, with minimum no greater than maximum.",
      fix: "Adjust --min-rating and --max-rating.",
    });
  }
  return options;
}

function help() {
  return `List recent low-rated Pixy reviews from App Store Connect and Google Play Console.\n\nUsage:\n  bun run reviews -- [options]\n\nOptions:\n  --store all|app-store|play  Store source (default: all)\n  --limit N                   Matching reviews per store (default: 50, max: 1000)\n  --min-rating N              Lowest included rating (default: 1)\n  --max-rating N              Highest included rating (default: 3)\n  --apple-id ID               App Store Connect app resource ID override\n  --apple-bundle-id ID        App bundle ID (default: com.devmood.pixymoodtracker)\n  --play-package NAME         Google Play package (default: ${DEFAULT_PLAY_PACKAGE})\n  --json                      Emit stable JSON instead of a table\n\nCredentials (read-only access):\n  App Store Connect: APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH\n  Google Play:       GOOGLE_PLAY_SERVICE_ACCOUNT_JSON\n\nThe Google service account needs Google Play Console access to this app and the Android Publisher API enabled.\nThe App Store Connect API key needs access to this app. Secrets stay in local files/environment and are never printed.\n`;
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function readCredential({ pathEnv, missingMessage, fix }) {
  const filePath = process.env[pathEnv];
  if (!filePath) {
    fail({
      status: 2,
      message: missingMessage,
      why: `${pathEnv} is not set.`,
      fix,
    });
  }
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    fail({
      status: 2,
      message: "Credential file is not readable",
      why: `${pathEnv} points to a file that cannot be read.`,
      fix: `Set ${pathEnv} to a readable local credential file.`,
    });
  }
}

async function createAppleToken() {
  const issuer = process.env.APPLE_ISSUER_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const keyPath = process.env.APPLE_PRIVATE_KEY_PATH;
  if (!issuer || !keyId || !keyPath) {
    fail({
      status: 2,
      message: "App Store Connect credentials are missing",
      why: "APPLE_ISSUER_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY_PATH are required.",
      fix: "Create an App Store Connect API key with app access and set the three environment variables.",
    });
  }
  try {
    const privateKey = await readFile(keyPath, "utf-8");
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encodeBase64Url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }))}.${encodeBase64Url(JSON.stringify({ iss: issuer, iat: now, exp: now + 15 * 60, aud: "appstoreconnect-v1" }))}`;
    const signer = createSign("SHA256");
    signer.update(unsigned);
    signer.end();
    const signature = signer
      .sign({ key: createPrivateKey(privateKey), dsaEncoding: "ieee-p1363" })
      .toString("base64url");
    return `${unsigned}.${signature}`;
  } catch {
    fail({
      status: 2,
      message: "App Store Connect key could not be used",
      why: "The private key file is unreadable or is not a valid EC private key.",
      fix: "Check APPLE_PRIVATE_KEY_PATH and use the .p8 key that matches APPLE_KEY_ID.",
    });
  }
}

async function requestJson({ url, headers = {} }) {
  let response;
  try {
    response = await fetch(url, { headers });
  } catch {
    fail({
      status: 3,
      message: "Review API request failed",
      why: "The store API could not be reached.",
      fix: "Check network access, then retry.",
    });
  }
  if (!response.ok) {
    let safeReason = `The store API returned HTTP ${response.status}.`;
    let fix = "Retry later and check the store API status.";
    if (response.status === 401 || response.status === 403) {
      safeReason = "The API rejected the configured credentials or app access.";
      fix =
        "Verify API enablement, app access, and read permissions for the credential.";
    }
    fail({
      status: 3,
      message: "Could not retrieve reviews",
      why: safeReason,
      fix,
    });
  }
  try {
    return await response.json();
  } catch {
    fail({
      status: 3,
      message: "Store API returned invalid JSON",
      why: "The response body could not be parsed.",
      fix: "Retry later; if this persists, check the store API response format.",
    });
  }
}

async function fetchAppleReviews(options) {
  const token = await createAppleToken();
  const reviews = [];
  let appId = options.appleId;
  if (!appId) {
    const lookup = new URL(`${APPLE_API}/apps`);
    lookup.searchParams.set("filter[bundleId]", options.appleBundleId);
    const apps = await requestJson({
      url: lookup,
      headers: { Authorization: `Bearer ${token}` },
    });
    appId = apps.data?.[0]?.id;
    if (!appId) {
      fail({
        status: 3,
        message: "App not found in App Store Connect",
        why: `No app matched bundle ID ${options.appleBundleId}.`,
        fix: "Check the bundle ID or pass its App Store Connect app resource ID with --apple-id.",
      });
    }
  }
  let url = new URL(
    `${APPLE_API}/apps/${encodeURIComponent(appId)}/customerReviews`
  );
  url.searchParams.set("limit", "200");
  url.searchParams.set("sort", "-createdDate");
  url.searchParams.set(
    "filter[rating]",
    Array.from({ length: options.maxRating - options.minRating + 1 }, (_, i) =>
      String(options.minRating + i)
    ).join(",")
  );

  while (url && reviews.length < options.limit) {
    const page = await requestJson({
      url,
      headers: { Authorization: `Bearer ${token}` },
    });
    for (const item of page.data ?? []) {
      const a = item.attributes ?? {};
      reviews.push({
        store: "app-store",
        id: item.id,
        rating: a.rating,
        date: a.createdDate,
        title: a.title ?? "",
        text: a.body ?? "",
        author: a.reviewerNickname ?? "",
        territory: a.territory ?? "",
        version: "",
      });
    }
    if (page.links?.next) {
      url = new URL(page.links.next);
    } else {
      url = null;
    }
  }
  return reviews;
}

async function createGoogleAccessToken() {
  let account;
  try {
    account = JSON.parse(
      await readCredential({
        pathEnv: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
        missingMessage: "Google Play credentials are missing",
        fix: "Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to a service-account JSON file with Play Console app access.",
      })
    );
  } catch (error) {
    if (error.details) {
      throw error;
    }
    fail({
      status: 2,
      message: "Google service-account file is invalid",
      why: "The credential file is not valid JSON or lacks the expected service-account fields.",
      fix: "Use a Google Cloud service-account JSON key and point GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to it.",
    });
  }
  if (!account.client_email || !account.private_key || !account.token_uri) {
    fail({
      status: 2,
      message: "Google service-account file is incomplete",
      why: "client_email, private_key, or token_uri is missing.",
      fix: "Use an unmodified service-account JSON key file.",
    });
  }
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${encodeBase64Url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: account.token_uri, iat: now, exp: now + 3600 }))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;
  const tokenUrl = account.token_uri;
  let response;
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
  } catch {
    fail({
      status: 3,
      message: "Google OAuth request failed",
      why: "Google OAuth could not be reached.",
      fix: "Check network access, then retry.",
    });
  }
  if (!response.ok) {
    fail({
      status: 3,
      message: "Google OAuth rejected the service account",
      why: `Google OAuth returned HTTP ${response.status}.`,
      fix: "Check that the service-account key is active and the Android Publisher API is enabled.",
    });
  }
  let data;
  try {
    data = await response.json();
  } catch {
    fail({
      status: 3,
      message: "Google OAuth returned invalid JSON",
      why: "The response body could not be parsed.",
      fix: "Retry later; if this persists, check the Google OAuth response format.",
    });
  }
  if (!data.access_token) {
    fail({
      status: 3,
      message: "Google OAuth response has no access token",
      why: "The OAuth response did not include access_token.",
      fix: "Check service-account configuration and retry.",
    });
  }
  return data.access_token;
}

function formatGoogleDate(timestamp) {
  if (!timestamp?.seconds) {
    return "";
  }
  return new Date(
    Number(timestamp.seconds) * 1000 +
      Math.floor(Number(timestamp.nanos ?? 0) / 1e6)
  ).toISOString();
}

async function fetchPlayReviews(options) {
  const token = await createGoogleAccessToken();
  const reviews = [];
  let pageToken;
  do {
    const url = new URL(
      `${PLAY_API}/applications/${encodeURIComponent(options.playPackage)}/reviews`
    );
    url.searchParams.set("maxResults", "100");
    if (pageToken) {
      url.searchParams.set("token", pageToken);
    }
    const page = await requestJson({
      url,
      headers: { Authorization: `Bearer ${token}` },
    });
    for (const item of page.reviews ?? []) {
      const user = item.comments?.find(
        (comment) => comment.userComment
      )?.userComment;
      if (
        !user ||
        user.starRating < options.minRating ||
        user.starRating > options.maxRating
      ) {
        continue;
      }
      reviews.push({
        store: "play",
        id: item.reviewId,
        rating: user.starRating,
        date: formatGoogleDate(user.lastModified ?? user.reviewSubmitDate),
        title: "",
        text: user.text ?? "",
        author: item.authorName ?? "",
        territory: user.reviewerLanguage ?? "",
        version: user.appVersionName ?? "",
      });
    }
    pageToken = page.tokenPagination?.nextPageToken;
  } while (pageToken && reviews.length < options.limit);
  return reviews;
}

function sortReviews(reviews) {
  return reviews.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.store.localeCompare(b.store) ||
      a.id.localeCompare(b.id)
  );
}

function printTable(reviews) {
  if (reviews.length === 0) {
    process.stdout.write("No matching reviews found.\n");
    return;
  }
  for (const review of reviews) {
    let territory = "";
    if (review.territory) {
      territory = ` · ${review.territory}`;
    }
    process.stdout.write(
      `[${review.store}] ${review.date} · ${review.rating}/5 · ${review.author}${territory}\n`
    );
    if (review.title) {
      process.stdout.write(`${review.title}\n`);
    }
    process.stdout.write(`${review.text.replaceAll(/\s+/g, " ").trim()}\n\n`);
  }
}

/**
 * Runs the review listing CLI and returns its process exit code.
 * @returns {Promise<number>} `0` when all requested sources succeed, otherwise `1`.
 */
export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(help());
      return 0;
    }
    let stores;
    if (options.store === "all") {
      stores = ["app-store", "play"];
    } else {
      stores = [options.store];
    }
    const settled = await Promise.all(
      stores.map(async (store) => {
        try {
          let reviews;
          if (store === "app-store") {
            reviews = await fetchAppleReviews(options);
          } else {
            reviews = await fetchPlayReviews(options);
          }
          return { store, reviews };
        } catch (error) {
          let { details } = error;
          if (!details) {
            details = {
              status: 1,
              message: "Review listing failed",
              why: "An unexpected error occurred.",
              fix: "Retry and inspect the CLI configuration.",
            };
          }
          return { store, reviews: [], error: details };
        }
      })
    );
    const results = settled.filter((result) => !result.error);
    const errors = settled
      .filter((result) => result.error)
      .map(({ store, error }) => ({ store, ...error }));
    const all = sortReviews(results.flatMap((result) => result.reviews)).slice(
      0,
      options.limit * stores.length
    );
    if (options.json) {
      const limitations = [];
      if (stores.includes("play")) {
        limitations.push(PLAY_REVIEW_LIMITATION);
      }
      process.stdout.write(
        `${JSON.stringify({ reviews: all, errors, limitations }, null, 2)}\n`
      );
    } else {
      printTable(all);
      for (const error of errors) {
        process.stderr.write(`${JSON.stringify(error)}\n`);
      }
      if (stores.includes("play")) {
        process.stderr.write(
          `Note: ${PLAY_REVIEW_LIMITATION} Use Play Console's CSV export for older reviews.\n`
        );
      }
    }
    if (errors.length > 0) {
      return 1;
    }
    return 0;
  } catch (error) {
    let { details } = error;
    if (!details) {
      details = {
        status: 1,
        message: "Review listing failed",
        why: "An unexpected error occurred.",
        fix: "Retry and inspect the CLI configuration.",
      };
    }
    process.stderr.write(`${JSON.stringify(details)}\n`);
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await main();
}
