import _ from "lodash";
import { ImportData } from "../helpers/Import";
import { migrateImportData } from "../helpers/Migration";
import { LogsState } from "../hooks/useLogs";
import { INITIAL_STATE } from "../hooks/useSettings";
import { Tag } from "../hooks/useTags";

const testTags: Tag[] = [
  {
    id: "1",
    title: "test1",
    color: "red",
  },
  {
    id: "2",
    title: "test2",
    color: "lime",
  },
];

const testItems: LogsState['items'] = {
  '2022-01-01': {
    date: '2022-01-01',
    rating: 'neutral',
    message: 'test message',
    tags: [...testTags],
  },
  '2022-01-02': {
    date: '2022-01-02',
    rating: 'neutral',
    message: '🦄',
    tags: [...testTags],
  }
}

const testImportData: ImportData = {
  version: "1.0.0",
  settings: { ...INITIAL_STATE },
  tags: [...testTags],
  items: {...testItems},
}

describe("MigrationHelper", () => {

  test("should `migrateImportData`", async () => {
    const newData = migrateImportData(testImportData);

    expect(newData).toEqual(testImportData);
  });

  test("should `migrateImportData` rewrite tag colors", async () => {
    const differentTags = testTags.map((tag) => ({
      ...tag,
      color: "stone",
    }));
    
    const itemKeys = Object.keys(testImportData.items)
    
    const newData = migrateImportData({
      ...testImportData,
      tags: differentTags,
      items: {
        [itemKeys[0]]: {
          ...testImportData.items[itemKeys[0]],
          tags: differentTags,
        },
        [itemKeys[1]]: {
          ...testImportData.items[itemKeys[1]],
        }
      }
    });

    expect(newData.tags![0].color).toEqual('slate');
    expect(newData.tags![1].color).toEqual('slate');
    expect(Object.values(newData.items)[0].tags![0].color).toEqual('slate');
    expect(Object.values(newData.items)[0].tags![1].color).toEqual('slate');
    expect(Object.values(newData.items)[1].tags![0].color).toEqual('red');
    expect(Object.values(newData.items)[1].tags![1].color).toEqual('lime');
  });

  test("should `migrateImportData` from settings tags", async () => {
    const newData = migrateImportData(_.omit({
      ...testImportData,
      settings: {
        ...INITIAL_STATE,
        tags: [...testTags],
      },
    }, 'tags'));

    expect(newData).toEqual(testImportData);
  })

});
