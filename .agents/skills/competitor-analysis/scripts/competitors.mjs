#!/usr/bin/env node

// Public App Store + Google Play competitor data. Node 18+, no dependencies, no API keys.
// Every command writes JSON into a run folder and prints a short JSON result to stdout.

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const DATA_ROOT = process.env.COMPETITOR_DATA || join(homedir(), 'competitor-analysis');
const DEFAULT_SELF = { apple: '1605327124', play: 'com.devmood.pixymoodtracker' };
const GENRES = { 'health-fitness': 6013, lifestyle: 6012, productivity: 6007, medical: 6020 };
const DAY = 86400000;
const SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'references', 'report.schema.json');

function fail(status, message, why, fix) {
  const error = new Error(message);
  error.details = { status, message, why, fix };
  throw error;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.error(...a);
const list = (v) => (v ? String(v).split(/[|,]/).map((s) => s.trim()).filter(Boolean) : []);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next === undefined || next.startsWith('--')) opts[key] = true;
      else { opts[key] = next; i += 1; }
    } else opts._.push(a);
  }
  return { command, opts };
}

async function request(url, { json = false, retries = 2 } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    let res;
    try {
      // Browser UA only for HTML store pages: Apple's JSON feeds return empty pages to it.
      res = await fetch(url, { headers: json ? {} : { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' } });
    } catch (error) {
      if (attempt < retries) { await sleep(1500 * (attempt + 1)); continue; }
      fail('network_error', `Request failed: ${new URL(url).host}`, error.message, 'Check internet access and retry.');
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt < retries) { await sleep(3000 * (attempt + 1)); continue; }
    }
    if (res.status === 404) return null;
    if (!res.ok) fail(`http_${res.status}`, `Request failed: ${new URL(url).host}`, `HTTP ${res.status} for ${url}`, 'Wait a minute (rate limit) and retry, or drop the failing app.');
    return json ? res.json() : res.text();
  }
}

async function runDir(opts) {
  if (!opts.run) fail('missing_run', 'Missing --run', 'Every command stores data in a named run folder.', 'Pass --run <short-name>, e.g. --run pixy-2026-09.');
  const dir = join(DATA_ROOT, opts.run);
  await mkdir(join(dir, 'apps'), { recursive: true });
  return dir;
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}
const writeJson = (path, data) => writeFile(path, `${JSON.stringify(data, null, 2)}\n`);

// ---------- Apple ----------

async function appleSearch(term, country, limit = 50) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=${limit}`;
  const data = await request(url, { json: true });
  return data?.results ?? [];
}

async function appleLookup(ids, country) {
  const url = `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${country}&entity=software`;
  const data = await request(url, { json: true });
  return data?.results ?? [];
}

function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function applePage(id, country, name) {
  const html = await request(`https://apps.apple.com/${country}/app/id${id}`);
  if (!html) return {};
  // Page embeds subtitles of similar apps too: anchor on this app's title, fall back to header lockup markup.
  const subtitle = html.match(new RegExp(`"title":"${escapeRe(JSON.stringify(name).slice(1, -1))}"[^{}]{0,400}?"subtitle":"([^"]*)"`))?.[1]
    ?? html.match(/class="subtitle svelte-[a-z0-9]+">([^<]*)</)?.[1];
  // IAP is the only annotation with price textPairs; title is localized ("In-App Purchases", "In-App-Käufe", ...).
  const iapBlock = html.match(/"\$kind":"Annotation","title":"[^"]*","summary":"[^"]*","items":\[\{"\$kind":"AnnotationItem","textPairs":(\[\[.*?\]\])\}/)?.[1];
  let inAppPurchases = [];
  try { inAppPurchases = iapBlock ? JSON.parse(iapBlock).map(([name, price]) => ({ name, price })) : []; } catch { /* layout changed */ }
  return { subtitle: subtitle ? decodeHtml(subtitle) : null, inAppPurchases };
}

function slimApple(r) {
  return {
    appleId: String(r.trackId),
    name: r.trackName,
    developer: r.artistName,
    bundleId: r.bundleId,
    url: r.trackViewUrl?.split('?')[0],
    genre: r.primaryGenreName,
    price: r.formattedPrice,
    rating: r.averageUserRating ? Number(r.averageUserRating.toFixed(2)) : null,
    ratings: r.userRatingCount ?? 0,
    ratingCurrentVersion: r.averageUserRatingForCurrentVersion ? Number(r.averageUserRatingForCurrentVersion.toFixed(2)) : null,
    ratingsCurrentVersion: r.userRatingCountForCurrentVersion ?? 0,
    version: r.version,
    released: r.releaseDate?.slice(0, 10),
    updated: r.currentVersionReleaseDate?.slice(0, 10),
    releaseNotes: r.releaseNotes,
    languages: r.languageCodesISO2A ?? [],
    sizeMB: r.fileSizeBytes ? Math.round(Number(r.fileSizeBytes) / 1e6) : null,
    minimumOs: r.minimumOsVersion,
    contentRating: r.contentAdvisoryRating,
    description: r.description,
    icon: r.artworkUrl512,
    screenshots: r.screenshotUrls ?? [],
    ipadScreenshots: (r.ipadScreenshotUrls ?? []).length,
  };
}

// Apple's review feed caches empty pages per URL form ("holes"). Rotate equivalent URL forms per page and skip holes instead of stopping.
const reviewUrls = (id, country, page) => [
  `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${id}/sortby=mostrecent/json`,
  `https://itunes.apple.com/${country}/rss/customerreviews/id=${id}/page=${page}/sortby=mostrecent/json`,
  `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${id}/sortBy=mostRecent/json`,
  `https://itunes.apple.com/${country}/rss/customerreviews/id=${id}/sortBy=mostRecent/page=${page}/json`,
];

async function appleReviews(id, country, pages) {
  const byId = new Map();
  let holes = 0;
  for (let page = 1; page <= pages; page += 1) {
    let arr = [];
    for (const url of reviewUrls(id, country, page)) {
      const data = await request(url, { json: true });
      const entries = data?.feed?.entry ?? [];
      arr = (Array.isArray(entries) ? entries : [entries]).filter((e) => e['im:rating']);
      if (arr.length) break;
      await sleep(300);
    }
    if (!arr.length) { holes += 1; if (page === 1 || holes >= 2) break; continue; }
    holes = 0;
    for (const e of arr) {
      byId.set(e.id?.label, {
        id: e.id?.label,
        country,
        stars: Number(e['im:rating'].label),
        date: e.updated?.label?.slice(0, 10),
        version: e['im:version']?.label,
        title: e.title?.label,
        text: e.content?.label,
      });
    }
    if (arr.length < 50) break;
    await sleep(400);
  }
  return [...byId.values()];
}

async function appleChart(kind, genre, country, limit = 100) {
  const feed = { free: 'topfreeapplications', paid: 'toppaidapplications', grossing: 'topgrossingapplications' }[kind];
  const data = await request(`https://itunes.apple.com/${country}/rss/${feed}/limit=${limit}/genre=${genre}/json`, { json: true });
  const entries = data?.feed?.entry ?? [];
  return entries.map((e, i) => ({ rank: i + 1, appleId: e.id?.attributes?.['im:id'], name: e['im:name']?.label }));
}

// ---------- Google Play ----------

async function playSearch(term, country) {
  const html = await request(`https://play.google.com/store/search?q=${encodeURIComponent(term)}&c=apps&hl=en&gl=${country}`);
  if (!html) return [];
  return [...new Set([...html.matchAll(/\/store\/apps\/details\?id=([A-Za-z0-9_.]+)/g)].map((m) => m[1]))];
}

async function playDetails(pkg, country) {
  const html = await request(`https://play.google.com/store/apps/details?id=${pkg}&hl=en&gl=${country}`);
  if (!html) return null;
  const text = (re) => { const m = html.match(re); return m ? decodeHtml(m[1]) : null; };
  const rating = text(/aria-label="Rated ([\d.]+) stars out of five stars"/);
  const reviews = text(/>([\d.,]+[KMB]?) reviews<\/div>/);
  return {
    playId: pkg,
    url: `https://play.google.com/store/apps/details?id=${pkg}`,
    name: text(/<h1[^>]*><span[^>]*>([^<]+)<\/span><\/h1>/) ?? text(/<title[^>]*>([^<]+?) - Apps on Google Play<\/title>/),
    developer: text(/href="\/store\/apps\/dev(?:eloper)?\?id=[^"]*"><span>([^<]+)<\/span>/),
    rating: rating ? Number(rating) : null,
    reviews,
    downloads: text(/>([\d.,]+[KMB]?\+)<\/div><div[^>]*>Downloads</),
    containsAds: /Contains ads/.test(html),
    inAppPurchases: /In-app purchases/.test(html),
    updated: text(/>Updated on<\/div><div[^>]*>([^<]+)</),
    shortDescription: text(/<meta name="description" content="([^"]*)"/),
  };
}

// ---------- Helpers ----------

function reviewStats(reviews, now = Date.now()) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) dist[r.stars] += 1;
  const last90 = reviews.filter((r) => now - Date.parse(r.date) <= 90 * DAY);
  const negative = reviews.filter((r) => r.stars <= 2).length;
  return {
    total: reviews.length,
    oldest: reviews.map((r) => r.date).sort()[0] ?? null,
    newest: reviews.map((r) => r.date).sort().at(-1) ?? null,
    distribution: dist,
    negativeShare: reviews.length ? Number((negative / reviews.length).toFixed(2)) : 0,
    last90Days: last90.length,
    last90DaysAvg: last90.length ? Number((last90.reduce((s, r) => s + r.stars, 0) / last90.length).toFixed(2)) : null,
  };
}

const tokens = (s) => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !['app', 'the', 'and', 'your', 'mood', 'tracker', 'diary', 'journal', 'daily'].includes(t)));

// Play search result is only trusted when the names share a distinctive token.
function namesMatch(a, b) {
  const ta = tokens(a);
  return [...tokens(b)].some((t) => ta.has(t));
}

// Single matcher for mentions, validate, and render: case-insensitive whole-word match over title + text.
// Trailing * matches a stem: "subscription*" hits "subscriptions".
const termRegex = (term) => {
  const stem = term.endsWith('*');
  const body = (stem ? term.slice(0, -1) : term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}${stem ? '' : '(?![\\p{L}\\p{N}])'}`, 'iu');
};
const mentionsTerm = (review, term) => termRegex(term).test(`${review.title} ${review.text}`);

function countMentions(reviews, terms) {
  const out = {};
  for (const term of terms) {
    const hits = reviews.filter((r) => mentionsTerm(r, term));
    out[term] = { mentions: hits.length, negative: hits.filter((r) => r.stars <= 2).length };
  }
  return out;
}

async function profiledIds(dir) {
  const profiles = await readJson(join(dir, 'profiles.json'), {});
  return Object.keys(profiles);
}

// ---------- Commands ----------

async function cmdFind(opts) {
  const dir = await runDir(opts);
  const terms = list(opts.terms);
  if (!terms.length) fail('missing_terms', 'Missing --terms', 'find needs search terms to query the stores.', 'Pass --terms "mood tracker|mood diary|year in pixels".');
  const country = opts.country || 'us';
  const must = list(opts.must).map((s) => s.toLowerCase());
  const exclude = list(opts.exclude).map((s) => s.toLowerCase());
  const maxRatings = opts['max-ratings'] ? Number(opts['max-ratings']) : Infinity;
  const self = String(opts.self || DEFAULT_SELF.apple);

  const apps = new Map();
  for (const term of terms) {
    log(`apple search: ${term}`);
    const results = await appleSearch(term, country, 50);
    results.forEach((r, i) => {
      const id = String(r.trackId);
      const entry = apps.get(id) ?? { ...slimApple(r), hits: [], description: undefined, screenshots: undefined, releaseNotes: undefined };
      entry.hits.push({ term, rank: i + 1 });
      entry.haystack = `${r.trackName} ${r.description ?? ''}`.toLowerCase();
      apps.set(id, entry);
    });
    await sleep(500);
  }

  const scored = [...apps.values()]
    .filter((a) => !exclude.some((x) => a.name.toLowerCase().includes(x)))
    .filter((a) => !must.length || must.some((w) => a.haystack.includes(w)))
    .map((a) => {
      const visibility = a.hits.reduce((s, h) => s + (51 - h.rank) / 50, 0) / terms.length; // 0..1
      const size = Math.min(Math.log10((a.ratings || 0) + 1) / 5, 1); // caps at 100k ratings
      const score = Number((visibility * 0.7 + size * 0.3).toFixed(3));
      const { haystack, ...rest } = a;
      return { ...rest, score, self: a.appleId === self };
    })
    .sort((x, y) => y.score - x.score);

  const shortlist = scored.filter((a) => a.ratings <= maxRatings);
  const overCap = scored.filter((a) => a.ratings > maxRatings).map((a) => ({ appleId: a.appleId, name: a.name, ratings: a.ratings }));

  let play = [];
  if (!opts['no-play']) {
    const seen = new Map();
    for (const term of terms) {
      log(`play search: ${term}`);
      (await playSearch(term, country)).slice(0, 30).forEach((pkg, i) => {
        const e = seen.get(pkg) ?? { playId: pkg, hits: [] };
        e.hits.push({ term, rank: i + 1 });
        seen.set(pkg, e);
      });
      await sleep(800);
    }
    play = [...seen.values()].sort((a, b) => b.hits.length - a.hits.length || a.hits[0].rank - b.hits[0].rank);
  }

  const out = { country, terms, must, createdAt: new Date().toISOString(), shortlist: shortlist.slice(0, 40), overCap, play: play.slice(0, 40) };
  await writeJson(join(dir, 'shortlist.json'), out);
  return {
    file: join(dir, 'shortlist.json'),
    apple: out.shortlist.slice(0, 15).map(({ appleId, name, rating, ratings, price, score, self: s, hits }) => ({ appleId, name, rating, ratings, price, score, self: s, termsHit: hits.length })),
    play: out.play.slice(0, 15).map(({ playId, hits }) => ({ playId, termsHit: hits.length })),
    overCap,
  };
}

async function cmdProfile(opts) {
  const dir = await runDir(opts);
  const ids = opts._.map((x) => String(x).match(/id?(\d{6,})/)?.[1] ?? x).filter((x) => /^\d+$/.test(x));
  if (!ids.length) fail('missing_ids', 'Missing App Store IDs', 'profile needs one or more numeric App Store IDs or app URLs.', 'Pass IDs from shortlist.json, e.g. profile 1194023242 1553223828 --run pixy.');
  const countries = list(opts.country || 'us');
  const playMap = Object.fromEntries(list(opts.play).map((pair) => pair.split('=')));
  const profiles = await readJson(join(dir, 'profiles.json'), {});

  for (const country of countries) {
    const results = await appleLookup(ids, country);
    for (const r of results) {
      const id = String(r.trackId);
      const base = profiles[id] ?? { appleId: id, storefronts: {} };
      const slim = slimApple(r);
      log(`apple page: ${slim.name} (${country})`);
      const page = await applePage(id, country, r.trackName);
      await sleep(700);
      if (country === countries[0]) Object.assign(base, slim, page);
      base.storefronts[country] = { rating: slim.rating, ratings: slim.ratings, price: slim.price, inAppPurchases: page.inAppPurchases };
      profiles[id] = base;
    }
  }

  for (const id of ids) {
    const p = profiles[id];
    if (!p) { log(`not found in App Store: ${id}`); continue; }
    if (playMap[id] === 'none') { p.play = { playId: null, match: 'none' }; continue; }
    let pkg = playMap[id];
    let match = pkg ? 'given' : null;
    if (!pkg && !opts['no-play'] && !p.play) {
      const candidates = await playSearch(p.name.split(/[-:–|]/)[0].trim(), countries[0]);
      pkg = candidates[0];
      match = 'search-first-result';
      await sleep(800);
    }
    const taken = new Set(Object.values(profiles).filter((o) => o !== p && o.play).map((o) => o.play.playId));
    if (pkg && match !== 'given' && taken.has(pkg)) { log(`play match skipped (already used): ${pkg}`); pkg = null; }
    if (pkg) {
      log(`play page: ${pkg}`);
      const details = await playDetails(pkg, countries[0]);
      if (details && match !== 'given' && !namesMatch(p.name, details.name)) {
        log(`play match rejected: ${p.name} != ${details.name}`);
        p.play = { playId: null, match: 'not-found', candidate: pkg, candidateName: details.name };
      } else if (details) p.play = { ...details, match };
      await sleep(800);
    }
  }

  await writeJson(join(dir, 'profiles.json'), profiles);
  return {
    file: join(dir, 'profiles.json'),
    apps: ids.map((id) => profiles[id]).filter(Boolean).map((p) => ({
      appleId: p.appleId, name: p.name, subtitle: p.subtitle, price: p.price, iap: p.inAppPurchases?.length ?? 0,
      rating: p.rating, ratings: p.ratings, updated: p.updated,
      developer: p.developer,
      play: p.play ? { playId: p.play.playId, name: p.play.name, developer: p.play.developer, match: p.play.match, rating: p.play.rating, downloads: p.play.downloads } : null,
    })),
    note: 'Check play.match=search-first-result entries: Play name and developer must match the Apple app, else re-run with --play "<appleId>=<package>".',
  };
}

async function cmdReviews(opts) {
  const dir = await runDir(opts);
  const ids = opts._.length ? opts._.map(String) : await profiledIds(dir);
  if (!ids.length) fail('missing_ids', 'No apps to fetch reviews for', 'No IDs were passed and profiles.json is empty.', 'Run profile first or pass App Store IDs.');
  const countries = list(opts.country || 'us');
  const pages = Math.min(Number(opts.pages || 10), 10);
  const profiles = await readJson(join(dir, 'profiles.json'), {});
  const summary = await readJson(join(dir, 'reviews-summary.json'), {});

  for (const id of ids) {
    const all = [];
    for (const country of countries) {
      log(`reviews: ${profiles[id]?.name ?? id} (${country})`);
      all.push(...await appleReviews(id, country, pages));
    }
    await mkdir(join(dir, 'apps', id), { recursive: true });
    await writeJson(join(dir, 'apps', id, 'reviews.json'), all);
    summary[id] = { name: profiles[id]?.name ?? id, countries, ...reviewStats(all) };
  }
  await writeJson(join(dir, 'reviews-summary.json'), summary);
  return { file: join(dir, 'reviews-summary.json'), summary: ids.map((id) => ({ appleId: id, ...summary[id] })), note: 'Apple RSS returns at most 500 most recent reviews per storefront.' };
}

async function cmdCharts(opts) {
  const dir = await runDir(opts);
  const country = opts.country || 'us';
  const genreKeys = list(opts.genre || 'health-fitness|lifestyle');
  const ids = new Set(await profiledIds(dir));
  const self = String(opts.self || DEFAULT_SELF.apple);
  ids.add(self);
  const out = { country, fetchedAt: new Date().toISOString(), charts: {} };
  for (const g of genreKeys) {
    const genre = GENRES[g] ?? Number(g);
    if (!genre) fail('bad_genre', `Unknown genre: ${g}`, `Known genres: ${Object.keys(GENRES).join(', ')}.`, 'Pass a known genre key or a numeric Apple genre ID.');
    for (const kind of ['free', 'paid', 'grossing']) {
      log(`chart: ${g} ${kind}`);
      const entries = await appleChart(kind, genre, country);
      out.charts[`${g}/${kind}`] = { top: entries.slice(0, 25), tracked: entries.filter((e) => ids.has(e.appleId)) };
      await sleep(400);
    }
  }
  await writeJson(join(dir, 'charts.json'), out);
  return { file: join(dir, 'charts.json'), tracked: Object.fromEntries(Object.entries(out.charts).map(([k, v]) => [k, v.tracked])) };
}

async function cmdKeywords(opts) {
  const dir = await runDir(opts);
  const terms = list(opts.terms);
  if (!terms.length) fail('missing_terms', 'Missing --terms', 'keywords needs terms to check search rank for.', 'Pass --terms "mood tracker|mood journal|pixel diary".');
  const country = opts.country || 'us';
  const profiles = await readJson(join(dir, 'profiles.json'), {});
  const self = String(opts.self || DEFAULT_SELF.apple);
  const ids = new Set([...Object.keys(profiles), self]);
  const rows = [];
  for (const term of terms) {
    log(`rank: ${term}`);
    const results = await appleSearch(term, country, 200);
    const ranks = {};
    for (const id of ids) {
      const idx = results.findIndex((r) => String(r.trackId) === id);
      ranks[id] = idx === -1 ? null : idx + 1;
    }
    const top10 = results.slice(0, 10).map((r) => r.trackName);
    const selfRank = ranks[self];
    const competitorsTop10 = Object.entries(ranks).filter(([id, r]) => id !== self && r && r <= 10).length;
    rows.push({ term, selfRank, competitorsTop10, gap: (!selfRank || selfRank > 10) && competitorsTop10 > 0, ranks, top10 });
    await sleep(500);
  }
  const names = Object.fromEntries([...ids].map((id) => [id, profiles[id]?.name ?? (id === self ? 'self' : id)]));
  await writeJson(join(dir, 'keywords.json'), { country, fetchedAt: new Date().toISOString(), self, names, rows });
  return { file: join(dir, 'keywords.json'), rows: rows.map(({ term, selfRank, competitorsTop10, gap }) => ({ term, selfRank, competitorsTop10, gap })) };
}

async function cmdMentions(opts) {
  const dir = await runDir(opts);
  const terms = list(opts.terms);
  if (!terms.length) fail('missing_terms', 'Missing --terms', 'mentions counts review text matches per term.', 'Pass --terms "sync|widget|export|ads|subscription".');
  const profiles = await readJson(join(dir, 'profiles.json'), {});
  const idsDir = await readdir(join(dir, 'apps')).catch(() => []);
  const out = {};
  for (const id of idsDir) {
    const reviews = await readJson(join(dir, 'apps', id, 'reviews.json'), []);
    out[id] = { name: profiles[id]?.name ?? id, reviews: reviews.length, terms: countMentions(reviews, terms) };
  }
  await writeJson(join(dir, 'mentions.json'), out);
  return { file: join(dir, 'mentions.json'), mentions: out };
}

// ---------- Report: schema + evidence validation, render ----------

// Minimal JSON Schema subset (the keywords report.schema.json uses). Unknown keywords fail loudly so the schema cannot silently outgrow the validator.
const SCHEMA_KEYWORDS = new Set(['$schema', '$id', 'title', 'description', 'type', 'const', 'enum', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'maxItems', 'minLength', 'pattern', 'minimum']);

function checkSchema(schema, value, path, errors) {
  const err = (why) => errors.push({ status: 'schema_violation', message: `Invalid report field ${path || '(root)'}`, why, fix: `Edit report.json at ${path || '(root)'} to satisfy references/report.schema.json.`, path });
  for (const key of Object.keys(schema)) {
    if (!SCHEMA_KEYWORDS.has(key)) fail('schema_unsupported', `Unsupported schema keyword: ${key}`, 'The built-in validator implements only a JSON Schema subset.', 'Use supported keywords or extend checkSchema in competitors.mjs.');
  }
  const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : Number.isInteger(v) ? 'integer' : typeof v);
  if (schema.const !== undefined && value !== schema.const) return err(`Expected ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}.`);
  if (schema.enum && !schema.enum.includes(value)) return err(`Expected one of ${schema.enum.join(', ')}, got ${JSON.stringify(value)}.`);
  if (schema.type) {
    const actual = typeOf(value);
    const ok = actual === schema.type || (schema.type === 'number' && actual === 'integer');
    if (!ok) return err(`Expected ${schema.type}, got ${actual}.`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) err(`Shorter than ${schema.minLength} characters.`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) err(`Does not match ${schema.pattern}.`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) err(`Below minimum ${schema.minimum}.`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) err(`Needs at least ${schema.minItems} items, has ${value.length}.`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) err(`Allows at most ${schema.maxItems} items, has ${value.length}.`);
    if (schema.items) value.forEach((v, i) => checkSchema(schema.items, v, `${path}[${i}]`, errors));
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) if (!(key in value)) err(`Missing required field "${key}".`);
    for (const [key, v] of Object.entries(value)) {
      const sub = schema.properties?.[key];
      if (sub) checkSchema(sub, v, path ? `${path}.${key}` : key, errors);
      else if (schema.additionalProperties === false) err(`Unknown field "${key}".`);
    }
  }
}

async function loadRunData(dir) {
  const need = async (file, fix) => {
    const data = await readJson(join(dir, file), null);
    if (!data) fail('missing_run_data', `Missing ${file}`, `${join(dir, file)} does not exist or is not valid JSON.`, fix);
    return data;
  };
  const profiles = await need('profiles.json', 'Run profile for every app in the report.');
  const keywords = await need('keywords.json', 'Run keywords with the report terms.');
  const reviews = {};
  for (const id of await readdir(join(dir, 'apps')).catch(() => [])) reviews[id] = await readJson(join(dir, 'apps', id, 'reviews.json'), null);
  return { profiles, keywords, reviews };
}

function checkEvidence(report, { profiles, keywords, reviews }) {
  const errors = [];
  const err = (status, path, message, why, fix) => errors.push({ status, message, why, fix, path });
  const known = (id, path) => {
    if (profiles[id]) return true;
    err('unknown_app', path, `App ${id} is not profiled`, `profiles.json has no entry for ${id}.`, `Run: profile ${id} --run ${report.run}`);
    return false;
  };

  known(report.self, 'self');
  const ids = report.competitors.map((c) => c.appleId);
  report.competitors.forEach((c, i) => {
    known(c.appleId, `competitors[${i}].appleId`);
    if (c.appleId === report.self) err('self_as_competitor', `competitors[${i}]`, 'Own app listed as competitor', 'competitors must exclude report.self.', 'Remove the entry.');
    if (ids.indexOf(c.appleId) !== i) err('duplicate_app', `competitors[${i}]`, `Duplicate competitor ${c.appleId}`, 'Each app appears once.', 'Merge the duplicate entries.');
  });

  report.themes.forEach((t, i) => {
    const path = `themes[${i}]`;
    if (!known(t.appleId, `${path}.appleId`)) return;
    const list = reviews[t.appleId];
    if (!list) return err('missing_reviews', path, `No reviews for ${t.appleId}`, `apps/${t.appleId}/reviews.json is missing.`, `Run: reviews ${t.appleId} --run ${report.run}`);
    const hits = list.filter((r) => mentionsTerm(r, t.searchTerm));
    const negative = hits.filter((r) => r.stars <= 2).length;
    if (hits.length !== t.mentions) err('count_mismatch', `${path}.mentions`, `Mention count for "${t.searchTerm}" is wrong`, `Report says ${t.mentions}, reviews.json has ${hits.length}.`, `Set mentions to ${hits.length}.`);
    if (negative !== t.negative) err('count_mismatch', `${path}.negative`, `Negative count for "${t.searchTerm}" is wrong`, `Report says ${t.negative}, reviews.json has ${negative}.`, `Set negative to ${negative}.`);
    t.quotes.forEach((q, j) => {
      const review = list.find((r) => r.id === q);
      if (!review) err('unknown_review', `${path}.quotes[${j}]`, `Review ${q} not found`, `apps/${t.appleId}/reviews.json has no review ${q}.`, 'Pick a review ID from that file.');
      else if (!mentionsTerm(review, t.searchTerm)) err('quote_off_theme', `${path}.quotes[${j}]`, `Review ${q} does not mention "${t.searchTerm}"`, 'Quotes must contain the theme search term.', 'Pick a review that matches the search term.');
      else if (t.kind === 'complaint' && review.stars > 3) err('quote_off_theme', `${path}.quotes[${j}]`, `Complaint quote ${q} has ${review.stars} stars`, 'Complaint quotes need 1-3 stars.', 'Pick a 1-3 star review.');
    });
  });

  // Completion bar from SKILL.md step 4: every direct competitor has >=2 complaint and >=1 praise themes.
  for (const c of report.competitors.filter((x) => x.type === 'direct')) {
    const mine = report.themes.filter((t) => t.appleId === c.appleId);
    const complaints = mine.filter((t) => t.kind === 'complaint').length;
    const praise = mine.filter((t) => t.kind === 'praise').length;
    if (complaints < 2 || praise < 1) err('thin_evidence', `themes(${c.appleId})`, `Too few themes for ${profiles[c.appleId]?.name ?? c.appleId}`, `Direct competitors need >=2 complaint and >=1 praise themes; found ${complaints} and ${praise}.`, 'Add themes from its reviews.');
  }

  const terms = new Set((keywords.rows ?? []).map((r) => r.term));
  report.keywords.forEach((k, i) => {
    if (!terms.has(k.term)) err('unknown_keyword', `keywords[${i}].term`, `Keyword "${k.term}" was not ranked`, 'keywords.json has no row for this term.', `Re-run keywords including "${k.term}".`);
  });
  report.featureGaps.forEach((g, i) => g.competitors.forEach((id, j) => known(id, `featureGaps[${i}].competitors[${j}]`)));
  return errors;
}

async function validateReport(dir) {
  const schema = await readJson(SCHEMA_PATH, null);
  if (!schema) fail('missing_schema', 'Report schema not found', `${SCHEMA_PATH} is missing or invalid.`, 'Restore references/report.schema.json.');
  const report = await readJson(join(dir, 'report.json'), null);
  if (!report) fail('missing_report', 'report.json not found', `${join(dir, 'report.json')} is missing or not valid JSON.`, 'Write report.json following references/report.schema.json.');
  const errors = [];
  checkSchema(schema, report, '', errors);
  if (!errors.length) errors.push(...checkEvidence(report, await loadRunData(dir)));
  return { report, errors };
}

async function cmdValidate(opts) {
  const dir = await runDir(opts);
  const { errors } = await validateReport(dir);
  if (errors.length) {
    console.log(JSON.stringify({ valid: false, errors }, null, 2));
    process.exit(1);
  }
  return { valid: true, file: join(dir, 'report.json') };
}

const priceValue = (p) => Number(String(p).replace(/[^0-9,.]/g, '').replace(/,(\d{2})$/, '.$1').replace(/,/g, ''));
function iapRange(iaps) {
  if (!iaps?.length) return '-';
  const sorted = [...iaps].sort((a, b) => priceValue(a.price) - priceValue(b.price));
  return sorted.length === 1 ? sorted[0].price : `${sorted[0].price} - ${sorted.at(-1).price}`;
}
const cell = (v) => String(v ?? '-').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');

async function cmdRender(opts) {
  const dir = await runDir(opts);
  const { report, errors } = await validateReport(dir);
  if (errors.length) fail('invalid_report', 'report.json failed validation', `${errors.length} error(s); first: ${errors[0].path}: ${errors[0].why}`, `Run: validate --run ${opts.run}`);
  const { profiles, keywords, reviews } = await loadRunData(dir);
  const name = (id) => profiles[id]?.name ?? id;
  const apps = [report.self, ...report.competitors.map((c) => c.appleId)];
  const typeOf = Object.fromEntries(report.competitors.map((c) => [c.appleId, c.type]));
  const out = [];

  out.push(`# ${name(report.self)} competitor analysis (${report.date}, ${report.storefronts.join(', ')})`, '');
  out.push('## TL;DR', '', ...report.tldr.map((t) => `- ${t}`), '');

  out.push('## Competitor set', '', table(
    ['App', 'Type', 'iOS rating (count)', 'Play rating / downloads', 'Price', ...report.storefronts.map((c) => `IAP ${c}`), 'Last update'],
    apps.map((id) => {
      const p = profiles[id];
      return [`[${p.name}](${p.url})`, id === report.self ? 'self' : typeOf[id], `${p.rating} (${p.ratings.toLocaleString('en-US')})`,
        p.play?.playId ? `${p.play.rating} / ${p.play.downloads}` : '-', p.price,
        ...report.storefronts.map((c) => iapRange(p.storefronts?.[c]?.inAppPurchases)), p.updated];
    }),
  ), '');

  out.push('## Positioning', '', table(['App', 'Subtitle', 'Lead claim', 'Positioning'],
    report.competitors.map((c) => [name(c.appleId), profiles[c.appleId].subtitle, c.leadClaim, c.positioning])), '');
  const money = report.competitors.filter((c) => c.monetization);
  if (money.length) out.push('## Monetization', '', ...money.map((c) => `- **${name(c.appleId)}**: ${c.monetization}`), '');

  out.push('## What users love / hate', '');
  for (const id of apps) {
    const themes = report.themes.filter((t) => t.appleId === id);
    if (!themes.length) continue;
    out.push(`### ${name(id)} (${reviews[id].length} recent reviews)`, '');
    for (const t of themes) {
      out.push(`- **${t.kind === 'complaint' ? 'Complaint' : 'Praise'}: ${t.theme}**: "${t.searchTerm}" in ${t.mentions} of ${reviews[id].length} reviews, ${t.negative} at 1-2 stars.`);
      for (const q of t.quotes) {
        const r = reviews[id].find((x) => x.id === q);
        out.push(`  > ${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)} ${r.date}, ${r.country}: **${cell(r.title)}** ${cell(r.text)}`);
      }
    }
    out.push('');
  }

  const rows = Object.fromEntries((keywords.rows ?? []).map((r) => [r.term, r]));
  out.push('## Keywords', '', table(['Term', `${name(report.self)} rank`, 'Competitors in top 10', 'Action', 'Rationale'],
    report.keywords.map((k) => {
      const r = rows[k.term];
      const top = report.competitors.filter((c) => r.ranks[c.appleId] && r.ranks[c.appleId] <= 10).map((c) => `${name(c.appleId)} #${r.ranks[c.appleId]}`);
      return [k.term, r.selfRank ?? 'not in top 200', top.join(', ') || '-', k.action, k.rationale];
    })), '');

  const allReviews = apps.flatMap((id) => reviews[id] ?? []);
  out.push('## Feature gaps', '', table(['Feature', 'Category', name(report.self), 'Competitors with it', 'Review demand'],
    report.featureGaps.map((g) => {
      const demand = g.demandTerm ? countMentions(allReviews, [g.demandTerm])[g.demandTerm] : null;
      return [g.feature, g.category, g.self, g.competitors.map(name).join(', ') || '-', demand ? `"${g.demandTerm}": ${demand.mentions} (${demand.negative} at 1-2 stars)` : '-'];
    })), '');

  out.push('## Recommendations', '', ...report.recommendations.map((r, i) => `${i + 1}. **${r.action}** (effort ${r.effort})\n   - Evidence: ${r.evidence}\n   - Effect: ${r.effect}`), '');
  out.push('## Limits', '', ...report.limits.map((l) => `- ${l}`), '');

  await writeFile(join(dir, 'report.md'), out.join('\n'));
  return { file: join(dir, 'report.md') };
}

function help() {
  return `Competitor data from public App Store and Google Play pages. No keys.

Usage: node competitors.mjs <command> [args] --run <name> [options]

Commands:
  find      --terms "a|b|c" [--must "w|x"] [--exclude "name"] [--max-ratings N] [--no-play]
            Search both stores per term, score apps by visibility + size -> shortlist.json
  profile   <appleId|url>... [--play "appleId=package,appleId=none"] [--no-play]
            Metadata, subtitle, IAP prices, Play rating/downloads -> profiles.json
  reviews   [appleId...] [--pages 1-10]
            Up to 500 recent App Store reviews per storefront -> apps/<id>/reviews.json, reviews-summary.json
  charts    [--genre "health-fitness|lifestyle"]
            Top 100 free/paid/grossing ranks for tracked apps -> charts.json
  keywords  --terms "a|b|c"
            Search rank (top 200) of self + profiled apps per term, flags gaps -> keywords.json
  mentions  --terms "a|b|c"
            Count review mentions per term per app -> mentions.json
  validate  Check report.json against references/report.schema.json and re-verify evidence
            (apps profiled, review IDs exist, mention counts recompute, keywords ranked). Exit 1 on errors.
  render    Validate, then write report.md from report.json + run data (quotes pulled verbatim)

Common options:
  --run NAME        Run folder under ${DATA_ROOT} (env COMPETITOR_DATA overrides root)
  --country us,de   Storefronts (first one used for search, charts, Play)
  --self ID         Own App Store ID (default ${DEFAULT_SELF.apple})
`;
}

async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));
  const commands = { find: cmdFind, profile: cmdProfile, reviews: cmdReviews, charts: cmdCharts, keywords: cmdKeywords, mentions: cmdMentions, validate: cmdValidate, render: cmdRender };
  if (!command || ['help', '--help', '-h'].includes(command) || opts.help) { console.log(help()); return; }
  if (!commands[command]) fail('unknown_command', `Unknown command: ${command}`, `Supported: ${Object.keys(commands).join(', ')}.`, 'Run with --help.');
  const result = await commands[command](opts);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const details = error.details ?? { status: 'unexpected_error', message: error.message, why: 'Unhandled exception (store layout may have changed).', fix: 'Re-run the command; if it persists, inspect the failing page and update the parser.' };
  console.error(JSON.stringify({ error: details }, null, 2));
  process.exit(1);
});
