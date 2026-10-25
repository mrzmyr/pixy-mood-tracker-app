import { movePerson, reorderPeople } from "../people-order";
import type { Person } from "../people-provider";

const person = (id: string, isArchived = false): Person => ({
  id,
  name: id,
  avatar: null,
  isArchived,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const ids = (people: Person[]) => people.map((item) => item.id);

describe("reorderPeople()", () => {
  it("puts people in the given order", () => {
    const people = [person("a"), person("b"), person("c")];

    expect(ids(reorderPeople(people, ["c", "a", "b"]))).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("keeps people missing from the order last, in their old order", () => {
    const people = [
      person("x", true),
      person("a"),
      person("y", true),
      person("b"),
    ];

    expect(ids(reorderPeople(people, ["b", "a"]))).toEqual([
      "b",
      "a",
      "x",
      "y",
    ]);
  });

  it("ignores unknown ids", () => {
    const people = [person("a"), person("b")];

    expect(ids(reorderPeople(people, ["gone", "b", "a"]))).toEqual(["b", "a"]);
  });
});

describe("movePerson()", () => {
  const people = [person("a"), person("b"), person("c")];

  it("swaps a person with the neighbor above or below", () => {
    expect(movePerson(people, "b", -1)).toEqual(["b", "a", "c"]);
    expect(movePerson(people, "b", 1)).toEqual(["a", "c", "b"]);
  });

  it("returns null at the edges and for unknown people", () => {
    expect(movePerson(people, "a", -1)).toBeNull();
    expect(movePerson(people, "c", 1)).toBeNull();
    expect(movePerson(people, "gone", 1)).toBeNull();
  });
});
