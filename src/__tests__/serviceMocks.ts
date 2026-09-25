import {
  FEEDBACK_URL,
  QUESTIONS_PULL_URL,
  QUESTION_SUBMIT_URL,
  STATISTICS_FEEDBACK_URL,
} from "@/constants/API";
import {
  resolveServiceMocks,
  resolveSuperwallEnabled,
} from "@/constants/Services";
import { createServiceFetch } from "@/lib/serviceFetch";
import { resolveDevelopmentSupportClient } from "@/support/clients";

describe("service mocks flag", () => {
  test("turns on only for non-production variants", () => {
    expect(resolveServiceMocks({ value: "true", variant: "preview" })).toBe(
      true
    );
    expect(resolveServiceMocks({ value: "true", variant: "development" })).toBe(
      true
    );
    expect(resolveServiceMocks({ value: "true", variant: "production" })).toBe(
      false
    );
    expect(resolveServiceMocks({ value: undefined, variant: "preview" })).toBe(
      false
    );
    expect(resolveServiceMocks({ value: "1", variant: "preview" })).toBe(false);
  });
});

describe("Superwall flag", () => {
  test("stays on by default so production keeps today's behavior", () => {
    expect(
      resolveSuperwallEnabled({ isServiceMocks: false, value: undefined })
    ).toBe(true);
    expect(resolveSuperwallEnabled({ isServiceMocks: false, value: "" })).toBe(
      true
    );
    expect(
      resolveSuperwallEnabled({ isServiceMocks: false, value: "true" })
    ).toBe(true);
  });

  test("turns off with false or with service mocks", () => {
    expect(
      resolveSuperwallEnabled({ isServiceMocks: false, value: "false" })
    ).toBe(false);
    expect(
      resolveSuperwallEnabled({ isServiceMocks: true, value: undefined })
    ).toBe(false);
  });
});

describe("service fetch", () => {
  test("passes requests through when mocks are off", async () => {
    const fetchImpl = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(["real"]),
        ok: true,
        status: 200,
      })
    );
    const serviceFetch = createServiceFetch({ fetchImpl, isMocked: false });

    const response = await serviceFetch(QUESTIONS_PULL_URL);

    expect(fetchImpl).toHaveBeenCalledWith(QUESTIONS_PULL_URL, undefined);
    await expect(response.json()).resolves.toEqual(["real"]);
  });

  test("answers every Pixy service without the network when mocked", async () => {
    const fetchImpl = jest.fn();
    const serviceFetch = createServiceFetch({ fetchImpl, isMocked: true });

    const questions = await serviceFetch(QUESTIONS_PULL_URL);
    await expect(questions.json()).resolves.toEqual([]);
    for (const url of [
      FEEDBACK_URL,
      QUESTION_SUBMIT_URL,
      STATISTICS_FEEDBACK_URL,
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- each URL is checked in turn
      const response = await serviceFetch(url, { method: "POST" });
      expect(response.ok).toBe(true);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("blocks unknown URLs with a structured error when mocked", async () => {
    const serviceFetch = createServiceFetch({
      fetchImpl: jest.fn(),
      isMocked: true,
    });

    await expect(serviceFetch("https://example.com")).rejects.toMatchObject({
      fix: expect.any(String),
      message: "Mocked build blocked a network request",
      status: "service_mock_missing",
      why: expect.stringContaining("https://example.com"),
    });
  });
});

describe("support client with service mocks", () => {
  test("uses the fake client even in release builds", async () => {
    const client = resolveDevelopmentSupportClient({
      isDevelopment: false,
      isServiceMocks: true,
    });

    expect(client?.enabled).toBe(true);
    await expect(client?.openSupport()).resolves.toBeUndefined();
  });

  test("keeps the configured provider in release builds without mocks", () => {
    expect(
      resolveDevelopmentSupportClient({
        isDevelopment: false,
        mode: "available",
      })
    ).toBeUndefined();
  });
});
