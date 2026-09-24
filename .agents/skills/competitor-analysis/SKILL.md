---
name: competitor-analysis
description: Competitor analysis for Pixy (or any mobile app) from public App Store and Google Play data, no API keys. Use when asked who competes with Pixy, how competitors price or position themselves, what users love or hate in rival apps, which keywords competitors win, or to refresh a competitor report.
---

# Competitor analysis

Engine: `scripts/competitors.mjs` (Node 18+, no dependencies). Run `node scripts/competitors.mjs --help` for commands. Every command writes JSON into `~/competitor-analysis/<run>/` (`COMPETITOR_DATA` overrides the root) and prints a compact JSON result. Reuse one `--run` name per analysis so data accumulates; the run folder is the source of truth for follow-up questions.

Pixy is the default `--self` (App Store `1605327124`, Play `com.devmood.pixymoodtracker`). Pixy's feature list: [`docs/features.md`](../../../docs/features.md).

## Evidence rules

- **Fetched numbers only.** Downloads, revenue, retention, and keyword volume are not public. Use proxies and name them: Play download bucket (`10K+`), App Store rating count, Top Free rank (download signal), Top Grossing rank (revenue signal).
- **Quote by review ID.** Themes cite review IDs; `render` prints the verbatim text, stars, date, and storefront.
- **Count by search term.** A theme's `mentions` and `negative` are exact counts of its `searchTerm` (case-insensitive whole word; trailing `*` for stems, e.g. `subscription*`) in that app's `reviews.json`; `mentions --terms` gives them.
- **Verify every Play match.** `profile` auto-matches Play packages by search. Accept a `search-first-result` match only when Play name and developer both fit the Apple listing. Fix with `--play "<appleId>=<package>"` or `--play "<appleId>=none"`.
- **One script instance at a time.** Stores rate-limit; the script paces itself.

## Steps

1. **Seed terms.** Write 6 to 10 terms a user would type: category nouns (`mood tracker`, `mood diary`), Pixy's hooks (`year in pixels`, `pixel diary`), adjacent jobs (`emotion tracker`, `mental health journal`). Pick 1 to 3 `--must` words a true competitor has in its name or description. Done when every Pixy core feature in `docs/features.md` maps to at least one term.
2. **Find.** `find --terms "a|b|c" --must "mood|emotion|feel" --run <run>`. Pick 8 to 12 direct competitors from `shortlist.json` Apple and Play lists. Classify each as **direct** (mood logging is the core loop), **adjacent** (journal, CBT, habit, self-care pet), or **giant** (>100k ratings). Done when the set includes the category leader, the closest pixel/calendar look-alike, and at least one small indie app.
3. **Profile.** `profile <ids...> --country us,de --run <run> --play "<known mappings>"`. Include Pixy. Done when every app has subtitle, price, IAP list, rating, rating count, last update, and a verified Play entry or `none`.
4. **Reviews.** `reviews --country us,gb,de --run <run>` (up to 500 recent per storefront). Then `mentions --terms "..."` with complaint and praise words: pricing (`subscription`, `premium`, `paywall`, `ads`), trust (`sync`, `backup`, `lost`, `export`, `privacy`), product (`widget`, `reminder`, `stats`, `calendar`, `pixel`, `tags`). Read the 1 to 2 star reviews of each leader in full. Done when each direct competitor has 2 or more complaint themes and 1 or more praise theme, each with a search term, exact counts, and 1 to 3 quote review IDs.
5. **Rank.** `keywords --terms "..." --run <run>` with the step 1 terms plus competitor subtitle phrases. `charts --run <run>` for Health & Fitness and Lifestyle. Done when every term has Pixy's rank, competitors in top 10, and a `gap` flag.
6. **Read creatives.** Open icon and first three screenshots (`icon`, `screenshots` in `profiles.json`) of the top 5 competitors. Note headline claim per screenshot, visual style, and which feature leads.
7. **Write `report.json`** in the run folder, following [`references/report.schema.json`](references/report.schema.json). The report holds conclusions and references only: app IDs, review IDs, search terms, keyword terms. Ratings, prices, ranks, and quote text stay in the run data.
8. **Validate.** `validate --run <run>`. It checks the schema, then re-verifies evidence: every app profiled, every review ID exists and contains its search term, every mention count recomputes exactly, every keyword term ranked, every direct competitor has 2+ complaint and 1+ praise themes. Fix each error with its `fix` field and re-run. Done when it prints `"valid": true`.
9. **Render.** `render --run <run>` writes `report.md` from `report.json` plus run data, quotes pulled verbatim. The repo is public: commit or publish the report only after Moritz confirms.

## Follow-ups

Answer from the run folder with short Node or Python one-liners over `apps/<id>/reviews.json`, `profiles.json`, `keywords.json`. `profile` again on the same run to refresh; compare old numbers from the report before overwriting.

## Unavailable

Downloads beyond Play buckets, revenue, retention, DAU, keyword search volume, Play reviews text, App Store reviews older than the latest 500 per storefront. State the gap in the report when a question needs one.
