const isRemoteUrl = (url: string) => /^https?:/iu.test(url);

/**
 * Sitemap capture bundles only (`IS_SITEMAP_CAPTURE`). Fails every http(s)
 * `fetch`, so screenshots never depend on a server: announcements,
 * questions, and PostHog get no answer. Local asset and file URLs still
 * load. Native modules (maps, geocoding) do not use `fetch`; capture keeps
 * location permission off instead. Call once at module load, before the
 * first render.
 */
export const blockSitemapNetwork = () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    return isRemoteUrl(url)
      ? Promise.reject(new TypeError(`sitemap_network_blocked: ${url}`))
      : realFetch(input, init);
  };
};
