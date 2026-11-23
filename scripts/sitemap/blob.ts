// Remote capture cache and site images in Vercel Blob. Paths are content
// addressed, so an upload never changes what an existing URL serves:
//   states/<input hash>.json  cache entry (PNG hash, tree)
//   png/<png hash>.png        full-size normalized screenshot
//   small/<png hash>.png      site image
import fs from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";

import { del, list, put } from "@vercel/blob";

import { CliError, note } from "../cli/shared.ts";

/** A Blob request can hang with no reply; abort it and retry. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Reject after REQUEST_TIMEOUT_MS. `put` can hang past its abortSignal, so
 * the abort alone does not end the wait.
 */
const withTimeout = <T>(work: Promise<T>) =>
  Promise.race([
    work,
    sleep(REQUEST_TIMEOUT_MS).then(() => {
      throw new CliError({
        status: "blob_timeout",
        message: `Vercel Blob gave no reply after ${REQUEST_TIMEOUT_MS / 1000}s`,
        why: "The request hung past its abort signal.",
        fix: "Retry; uploads retry on their own first.",
      });
    }),
  ]);

/** Without the token, capture uses the local cache only. */
export const hasBlobToken = () =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());

const requireToken = () => {
  if (!hasBlobToken()) {
    throw new CliError({
      exitCode: 2,
      status: "blob_token_missing",
      message: "BLOB_READ_WRITE_TOKEN is not set",
      why: "Site images and the shared capture cache live in Vercel Blob.",
      fix: "Run `bunx vercel@60.1.3 env pull` in a checkout linked to the sitemap project, or set the token from the project's Blob store. CI reads it from a repository secret.",
    });
  }
};

const wrap = (action: string, why: string) =>
  new CliError({
    status: "blob_failed",
    message: `Vercel Blob ${action} failed`,
    why,
    fix: "Check BLOB_READ_WRITE_TOKEN and network access, then retry.",
  });

/** One stored blob. */
export interface RemoteBlob {
  url: string;
  pathname: string;
  uploadedAt: Date;
}

/** Every blob under `prefix`, keyed by pathname. */
export const listBlobs = async (prefix = "") => {
  requireToken();
  const found = new Map<string, RemoteBlob>();
  let cursor: string | undefined;
  try {
    do {
      // oxlint-disable-next-line no-await-in-loop -- pages depend on the cursor
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const blob of page.blobs) {
        found.set(blob.pathname, blob);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (error) {
    throw wrap("list", error instanceof Error ? error.message : String(error));
  }
  return found;
};

/** Download a blob to `file`. */
export const download = async (url: string, file: string) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw wrap("download", `${response.status} for ${url}`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
};

const UPLOAD_BATCH = 8;
/** Blob puts time out now and then; a retry passes. */
const UPLOAD_ATTEMPTS = 3;

/** Upload local files; content-addressed, so existing paths are skipped. */
export const uploadAll = async (
  files: { pathname: string; file: string }[],
  existing: Map<string, RemoteBlob>
) => {
  requireToken();
  const missing = files.filter(({ pathname }) => !existing.has(pathname));
  const upload = async ({
    pathname,
    file,
  }: {
    pathname: string;
    file: string;
  }) => {
    let lastMessage = "";
    for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- retry after a timeout
        const blob = await withTimeout(
          put(pathname, fs.readFileSync(file), {
            access: "public",
            addRandomSuffix: false,
            allowOverwrite: true,
            cacheControlMaxAge: 31_536_000,
            abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            contentType: pathname.endsWith(".json")
              ? "application/json"
              : "image/png",
          })
        );
        existing.set(pathname, { ...blob, uploadedAt: new Date() });
        return;
      } catch (error) {
        lastMessage = error instanceof Error ? error.message : String(error);
      }
    }
    throw wrap(`upload of ${pathname}`, lastMessage);
  };
  // A full capture uploads over a thousand files; one at a time takes an hour.
  for (let index = 0; index < missing.length; index += UPLOAD_BATCH) {
    // oxlint-disable-next-line no-await-in-loop -- batches of UPLOAD_BATCH
    await Promise.all(missing.slice(index, index + UPLOAD_BATCH).map(upload));
    if (index > 0 && index % (UPLOAD_BATCH * 10) === 0) {
      note(`Blob: uploaded ${index} of ${missing.length} files`);
    }
  }
  note(`Blob: uploaded ${missing.length} files`);
};

/** Delete blobs by URL. */
export const deleteBlobs = async (urls: string[]) => {
  requireToken();
  for (let index = 0; index < urls.length; index += 100) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- batches of 100
      await del(urls.slice(index, index + 100));
    } catch (error) {
      throw wrap(
        "delete",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
};

/** Public origin of the store, read from any stored blob. */
export const blobOrigin = (blobs: Map<string, RemoteBlob>) => {
  const first = blobs.values().next().value;
  if (!first) {
    throw new CliError({
      status: "blob_empty",
      message: "Blob store has no captures",
      why: "The site loads its images from the store, so it needs at least one upload.",
      fix: "Run `bun sitemap capture` with BLOB_READ_WRITE_TOKEN set, then retry.",
    });
  }
  return new URL(first.url).origin;
};
