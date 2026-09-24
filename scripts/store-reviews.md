# Store reviews CLI

List Pixy customer reviews from App Store Connect and Google Play Console. Results are filtered by star rating, sorted newest first, then by store and review ID for stable tie ordering. Each store returns up to `--limit` matches.

```sh
bun run reviews -- --store all --min-rating 1 --max-rating 3 --limit 50
bun run reviews -- --store play --json
```

## App Store Connect

Create an App Store Connect API key with access to Pixy. Set these variables in your shell. `APPLE_PRIVATE_KEY_PATH` points to the downloaded `.p8` key file. The CLI finds the app resource using its bundle ID (`com.devmood.pixymoodtracker`); use `--apple-id` to pass the App Store Connect resource ID directly.

```sh
export APPLE_ISSUER_ID='...'
export APPLE_KEY_ID='...'
export APPLE_PRIVATE_KEY_PATH='/secure/path/AuthKey_....p8'
```

## Google Play Console

Enable the Google Play Android Developer API in the service account's Google Cloud project. Grant that service account read access to Pixy in Play Console, then point the CLI at its local JSON key file:

```sh
export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='/secure/path/service-account.json'
```

Google's Reviews API only returns reviews created or modified in the last 7 days. The CLI includes this limit in its output. Use Play Console's CSV export for older reviews.

Keep both key files outside the repository. The CLI only reads reviews and never prints credential material.

## Options

Run `bun run reviews -- --help` for every option. Defaults: both stores, 1–3 stars, 50 matches per store. `--json` returns `{ "reviews": [...], "errors": [...], "limitations": [...] }` for scripting. If one source is unavailable, the CLI still prints results from the other source and reports that source's structured error on stderr (or in the JSON `errors` array).
