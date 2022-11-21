import { convertPixeltoPixyJSON, getJSONSchemaType } from "../helpers/Import";
import { migrateImportData } from "../helpers/migration";
import { INITIAL_STATE } from "../hooks/useSettings";

xdescribe("getJSONSchemaType", () => {
  test("pixy schema: valid", async () => {
    const json = {
      items: {
        "2022-01-23": {
          date: "2022-01-23",
          rating: "extremely_good",
          message: "test message",
          tags: [
            { id: "bb65f208-4e4c-11ed-bdc3-0242ac120002" },
            { id: "a8e3f89d-4dd3-43f9-8275-2c291f080392" },
          ],
        },
      },
      settings: {
        ...INITIAL_STATE,
      },
    };

    const migrated = migrateImportData(json);

    expect(getJSONSchemaType(migrated)).toBe("pixy");
  });

  test("pixy schema: reject invalid date key", async () => {
    const json = {
      items: {
        "2020-23": {
          date: "2022-01-23",
          rating: "extremely_good",
          message: "test message",
        },
      },
    };

    const migrated = migrateImportData(json);
    expect(getJSONSchemaType(migrated)).toBe("unknown");
  });

  test("pixy schema: invalid date key", async () => {
    const json = {
      items: {
        "2020-23": {
          date: "2022-01-23",
          rating: "extremely_good",
          message: "test message",
        },
      },
    };

    const migrated = migrateImportData(json);
    expect(getJSONSchemaType(migrated)).toBe("unknown");
  });

  test("pixy schema: wrong rating", async () => {
    const json = {
      items: {
        "2022-01-03": {
          date: "2022-01-03",
          rating: "really_good", // wrong rating
          message: "test message 2",
        },
      },
    };

    const migrated = migrateImportData(json);
    expect(getJSONSchemaType(migrated)).toBe("unknown");
  });

  test("pixy schema: invalid json structure", async () => {
    const json = {
      "2022-01-03": {
        date: "2022-01-03", // wrong date format
        rating: "extremely_good",
        message: "test message 2",
      },
    };

    const migrated = migrateImportData(json);
    expect(getJSONSchemaType(migrated)).toBe("unknown");
  });

  test("pixy schema: empty json", async () => {
    const json = {};
    const migrated = migrateImportData(json);
    expect(getJSONSchemaType(migrated)).toBe("unknown");
  });
});

describe("convertPixeltoPixyJSON", () => {
  test("convert pixel to pixy json", async () => {
    const json = [
      {
        mood: 1,
        emotions: [],
        notes: "",
        date: "2021-12-14",
      },
      {
        mood: 3,
        emotions: [],
        notes: "",
        date: "2021-12-15",
      },
    ];
    expect(convertPixeltoPixyJSON(json)).toEqual({
      items: [
        {
          date: "2021-12-14",
          rating: "extremely_bad",
          message: "",
          tags: [],
        },
        {
          date: "2021-12-15",
          rating: "neutral",
          message: "",
          tags: [],
        },
      ],
    });
  });
});
