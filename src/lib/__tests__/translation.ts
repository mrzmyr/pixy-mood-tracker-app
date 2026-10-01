import { createI18n } from "../translation";

describe("translation", () => {
  it("uses the Norwegian translation for a Norwegian Bokmål device", () => {
    expect(createI18n("nb-NO").t("save")).toBe("Lagre");
  });
});
