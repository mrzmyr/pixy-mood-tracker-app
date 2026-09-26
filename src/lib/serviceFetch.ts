import {
  FEEDBACK_URL,
  QUESTIONS_PULL_URL,
  QUESTION_SUBMIT_URL,
  STATISTICS_FEEDBACK_URL,
} from "@/constants/API";
import { SERVICE_MOCKS } from "@/constants/Services";
import { createStructuredError } from "./errors";

/** The part of `Response` that service callers read. */
export type ServiceResponse = Pick<Response, "json" | "ok" | "status">;

type FetchLike = (url: string, init?: RequestInit) => Promise<ServiceResponse>;

/** Fake JSON bodies: an empty list or an empty acknowledgement. */
type FakeBody = [] | Record<string, never>;

const jsonResponse = (body: FakeBody): ServiceResponse => ({
  json: () => Promise.resolve(body),
  ok: true,
  status: 200,
});

/**
 * Fake answers per service URL. Webhooks accept everything; the questions
 * API has no open questions, so flows never see a question slide.
 */
const FAKE_RESPONSES = new Map([
  [FEEDBACK_URL, jsonResponse({})],
  [QUESTIONS_PULL_URL, jsonResponse([])],
  [QUESTION_SUBMIT_URL, jsonResponse({})],
  [STATISTICS_FEEDBACK_URL, jsonResponse({})],
]);

/**
 * Create the fetch used for Pixy's own services. With `isMocked`, known
 * service URLs get fake responses and anything else is rejected, so mocked
 * builds never reach the network.
 */
export const createServiceFetch =
  ({
    fetchImpl,
    isMocked,
  }: {
    fetchImpl: FetchLike;
    isMocked: boolean;
  }): FetchLike =>
  (url, init) => {
    if (!isMocked) {
      return fetchImpl(url, init);
    }
    const fake = FAKE_RESPONSES.get(url);
    if (!fake) {
      return Promise.reject(
        createStructuredError({
          status: "service_mock_missing",
          message: "Mocked build blocked a network request",
          why: `No fake response is registered for ${url}.`,
          fix: "Add the URL to FAKE_RESPONSES in src/lib/serviceFetch.ts.",
        })
      );
    }
    return Promise.resolve(fake);
  };

/** Fetch for Pixy's webhooks and questions API; fake in mocked builds. */
export const serviceFetch = createServiceFetch({
  fetchImpl: (url, init) => fetch(url, init),
  isMocked: SERVICE_MOCKS,
});
