import type { Breadcrumb, ErrorEvent } from "@sentry/react-native";

/** Breadcrumb categories whose `data.url` names a network request. */
const REQUEST_CATEGORIES = new Set(["http", "fetch", "xhr"]);

/** URL without query string and fragment: both can carry user input. */
export const stripUrlQuery = (url: string) => url.split(/[?#]/u)[0];

/**
 * Copy of `value` without any `why` key, at any depth. `why` on a
 * `StructuredError` can quote stored user data; `status`, `message`, and
 * `fix` stay.
 */
const withoutWhy = <Value>(value: Value): Value =>
  // SAFETY: Sentry normalizes event data to JSON before `beforeSend`, so the
  // round trip keeps the shape. The reviver only deletes `why` keys.
  JSON.parse(JSON.stringify(value), (key, item) =>
    key === "why" ? undefined : item
  ) as Value;

/**
 * `beforeBreadcrumb` for Sentry. Drops console breadcrumbs: they hold logged
 * errors, `why` included. Request breadcrumbs keep the URL path only.
 * Other breadcrumbs, such as navigation, stay.
 */
export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb | null => {
  if (breadcrumb.category === "console") {
    return null;
  }
  const { category = "", data } = breadcrumb;
  if (REQUEST_CATEGORIES.has(category) && data?.url !== undefined) {
    return {
      ...breadcrumb,
      data: { ...data, url: stripUrlQuery(String(data.url)) },
    };
  }
  return breadcrumb;
};

/**
 * `beforeSend` for Sentry. Removes `user` (the native SDK fills in an install
 * id) and every `why` in `extra` and `contexts`. Runs breadcrumbs through
 * `scrubBreadcrumb` again, because native breadcrumbs skip `beforeBreadcrumb`.
 * Exceptions, stack traces, and device contexts stay.
 */
export const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  const { user: _user, ...rest } = event;
  const scrubbed: ErrorEvent = { ...rest };
  if (event.extra) {
    scrubbed.extra = withoutWhy(event.extra);
  }
  if (event.contexts) {
    scrubbed.contexts = withoutWhy(event.contexts);
  }
  if (event.breadcrumbs) {
    scrubbed.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((breadcrumb): breadcrumb is Breadcrumb => breadcrumb !== null);
  }
  return scrubbed;
};
