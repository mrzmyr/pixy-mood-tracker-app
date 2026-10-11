import { getJSONSchemaType } from "../import";
import { migrateImportData } from "../migration";
import { INITIAL_STATE } from "@/constants/Settings";

describe("getJSONSchemaType", () => {
  test("pixy schema: valid", () => {
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

  test("pixy schema: reject invalid date key", () => {
    const json = {
      items: {
        "2020-23": {
          date: "2022-01",
          rating: "extremely_good",
          message: "test message",
        },
      },
    };

    const migrated = migrateImportData(json);
    expect(getJSONSchemaType(migrated)).toBe("unknown");
  });

  test("pixy schema: wrong rating", () => {
    const json = {
      items: {
        "2022-01-03": {
          date: "2022-01-03",
          // wrong rating
          rating: "really_good",
          message: "test message 2",
        },
      },
    };

    const migrated = migrateImportData(json);
    expect(getJSONSchemaType(migrated)).toBe("unknown");
  });
  test("pixy schema: accepts photo metadata", () => {
    const json = {
      items: [
        {
          date: "2022-01-23",
          rating: "good",
          message: "",
          tags: [],
          photos: [
            {
              id: "8f8a7d3e-6c1f-4f59-9a52-2c9a5d1e7b10",
              fileName: "8f8a7d3e-6c1f-4f59-9a52-2c9a5d1e7b10.jpg",
              width: 1536,
              height: 2048,
              createdAt: "2022-01-23T10:00:00.000Z",
              source: "day",
              libraryId: "ABC-123/L0/001",
            },
          ],
        },
      ],
      settings: { ...INITIAL_STATE },
    };

    expect(getJSONSchemaType(migrateImportData(json))).toBe("pixy");
  });

  test("pixy schema: reject invalid photo metadata", () => {
    const json = {
      items: [
        {
          date: "2022-01-23",
          rating: "good",
          message: "",
          tags: [],
          photos: [{ id: "1", fileName: "1.jpg", width: "wide" }],
        },
      ],
      settings: { ...INITIAL_STATE },
    };

    expect(getJSONSchemaType(migrateImportData(json))).toBe("unknown");
  });
});
