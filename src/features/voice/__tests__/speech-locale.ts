import * as Localization from "expo-localization";
import { applyLocale } from "@/lib/translation";
import { getSpeechLocales } from "../speech-locale";

const deviceLocales = (first: string, ...rest: string[]) => {
  const [base] = Localization.getLocales();
  const toLocale = (tag: string) => {
    const [languageCode = null, regionCode = null] = tag.split("-");
    return { ...base, languageTag: tag, languageCode, regionCode };
  };
  return jest
    .spyOn(Localization, "getLocales")
    .mockReturnValue([toLocale(first), ...rest.map(toLocale)]);
};

describe("getSpeechLocales", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    applyLocale("en");
  });

  it("tries the device region, then the system recognizer, then the main region", () => {
    deviceLocales("en-DE", "de-DE");
    applyLocale("en");
    expect(getSpeechLocales()).toEqual(["en-DE", null, "en-US"]);
  });

  it("uses the main region when no device locale has the app language", () => {
    deviceLocales("fr-FR");
    applyLocale("de");
    expect(getSpeechLocales()).toEqual(["de-DE", null]);
  });
});
