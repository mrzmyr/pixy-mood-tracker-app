import { useAnonymizer } from "../hooks/useAnonymizer";
import { LogsState } from "../hooks/useLogs";
import { Tag } from "../hooks/useTags";

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

const testItems: LogsState['items'] = {
  '2022-01-01': {
    date: '2022-01-01',
    rating: 'neutral',
    message: 'test message',
    tags: []
  },
  '2022-01-02': {
    date: '2022-01-02',
    rating: 'neutral',
    message: '🦄',
  }
}

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

    expect(anonymizeItem(testItems['2022-01-01'])).toEqual({
      date: "2022-01-01",
      rating: "neutral",
      messageLength: 12,
      tags: [],
    })
  })

  it("anonymizeItem() when tags not set", () => {
    const { anonymizeItem } = useAnonymizer()

    expect(anonymizeItem(testItems['2022-01-02'])).toEqual({
      date: "2022-01-02",
      rating: "neutral",
      messageLength: '🦄'.length,
    })
  })

})