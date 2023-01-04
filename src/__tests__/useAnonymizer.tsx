import { useAnonymizer } from "../hooks/useAnonymizer";
import { LogsState } from "../hooks/useLogs";
import { Tag } from "../hooks/useTags";
import { _generateItem } from "./utils";

const testTags: Tag[] = [
  {
    id: "1",
    title: "test1",
    color: "slate",
  },
  {
    id: "2",
    title: "test2",
    color: "lime",
  },
];

const testItems: LogsState['items'] = [
  _generateItem({
    date: '2022-01-01',
    rating: 'neutral',
    message: 'test message',
    tags: []
  }),
  _generateItem({
    date: '2022-01-02',
    rating: 'neutral',
    message: '🦄',
  })
]

describe("useAnonymizer", () => {

  it("anonymizeTag()", () => {
    const { anonymizeTag } = useAnonymizer()

    expect(anonymizeTag(testTags[0])).toEqual({
      id: "1",
      color: "slate",
      titleLength: 5,
    })
  })

  it("anonymizeItem()", () => {
    const { anonymizeItem } = useAnonymizer()

    expect(anonymizeItem(testItems[0])).toEqual({
      date: "2022-01-01",
      rating: "neutral",
      messageLength: 12,
      tags: [],
      sleep: {
        quality: "neutral",
      },
      createdAt: expect.any(String),
      dateTime: expect.any(String),
      id: expect.any(String),
      emotions: [],
    })
  })

  it("anonymizeItem() when tags not set", () => {
    const { anonymizeItem } = useAnonymizer()

    expect(anonymizeItem(testItems[1])).toEqual({
      date: "2022-01-02",
      rating: "neutral",
      messageLength: '🦄'.length,
      tags: [],
      sleep: {
        quality: "neutral",
      },
      createdAt: expect.any(String),
      dateTime: expect.any(String),
      id: expect.any(String),
      emotions: [],
    })
  })

})